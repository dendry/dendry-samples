(function() {
	// Local aliases for the three core classes that run the game.
	var game;
	var engine;
	var ui;

	// Data calculated from the game, used to make level-creation simpler.
	var maxLevel;
	var scenesValidPerLevel;
	var onePerLevelSceneIds;

	// The grid of 9 tiles (1-9) is laid out 3x3, this array holds the
	// adjacency for each tile.
	var reachableTiles = [
		[2,4], [1,3,5], [2,6], [1,5,7], [2,4,6,8], [3,5,9], [4,8], [5,7,9], [6,8]
		];

	// Data that stores the randomly created level.
	var thisLevelSceneIds;
	var hasBeenToLocation;

	/* Scenes have tags indicating the levels at which they can appear in the 
	 * dungeon. This method uses those tags to find the deepest level. */
	var findMaximumLevel = function() {
		maxLevel = 1;
		for (var tag in game.tagLookup) {
			if (tag.substr(0, 5) === 'level') {
				var level = parseInt(tag.substr(5));
				if (level > maxLevel) maxLevel = level;
			}
		}
	};

	/* We're going to choose suitable rooms for each tile, this let's us
	 * find suitable rooms based on which level we're in. */
	var findLevelScenes = function() {
		scenesValidPerLevel = [];
		for (var i = 1; i <= maxLevel; ++i) {
			var levelName = "level"+i;
			var scenesMap = game.tagLookup[levelName];
			var scenes = [];
			for (var scene in scenesMap) {
				scenes.push(scene);
			}
			scenesValidPerLevel.push(scenes);
		}
	};

	/* Some rooms can have the 'one-per-level' tag set on them, which means
	 * that they won't be chosen for multiple rooms on a level. This stores
	 * a list of such rooms. */
	var findOnePerLevelScenes = function() {
		onePerLevelSceneIds = game.tagLookup['one-per-level'];
		if (onePerLevelSceneIds === undefined) onePerLevelSceneIds = {};
	};

	/* Scene tags are used to hold information for what images are used for
	 * a room's tile. This method helps extract a tag with a known prefix. */
	var getTagSuffix = function(tags, prefix) {
		var prefixLength = prefix.length;
		for (var i = 0; i < tags.length; ++i) {
			var tag = tags[i];
			if (tag.substr(0, prefixLength) === prefix) {
				return tag.substr(prefixLength);
			}
		}
		return null;
	};

	/* Sets the tile background image to the given image name. Images are png
	 * files held in the img/ subdirectory. They are displayed as CSS background
	 * images. */
	var setBackgroundImage = function($tile, imageName) {
		if (imageName) {
			$tile.css('background-image', "url('img/"+imageName+".png')");
		} else {
			$tile.css('background-image', 'none');
		}
	};

	/* Sets the randomly generated room for the given location. The room is a
	 * Dendry scene triggered when the player enters it. */
	var setLocationStoryId = function(locationNumber, thisSceneId) {
		// Store the story for this location.
		thisLevelSceneIds[locationNumber-1] = thisSceneId;

		// Change the corresponding tile appearance.
		var $tile = $('#tile'+locationNumber);
		if (thisSceneId !== null) {
			var sceneTags = game.scenes[thisSceneId].tags;
			var background = getTagSuffix(sceneTags, 'bg-');
			setBackgroundImage($tile, background || 'none');
		} else {
			setBackgroundImage($tile, 'none');
		}
	};

	/* Called when the level number changes. This sets up a new random level,
	 * and positions the character in the correction location. Because we assume
	 * that the level can only increase (i.e. previous levels can't be returned
	 * to), we can create a brand new random level each time. */
	var updateLevel = function() {
		var levelNumber = engine.state.qualities.level;

		thisLevelSceneIds = [null, null, null, null, null, null, null, null, null];

		// Change the depth indicator
		$('#level').html("Depth "+levelNumber);

		// Label the visited locations.
		$(".tile").removeClass('visited');
		$("#tile1").addClass('visited');

		// The first room is empty
		setLocationStoryId(1, null);

		// Randomly choose most rooms.
		var random = ui.dendryEngine.random;
		var validScenes = scenesValidPerLevel[levelNumber-1];
		for (var i = 2; i < 9; ++i) {
			var thisSceneIndex = random.uint32() % validScenes.length;
			var thisSceneId = validScenes[thisSceneIndex];

			if (onePerLevelSceneIds[thisSceneId]) {
				validScenes.splice(thisSceneIndex, 1);
			}

			setLocationStoryId(i, thisSceneId);			
		}
		// Set the exit or goal
		var lastLocationId = (levelNumber === maxLevel) ? 'goal' : 'stairs';
		setLocationStoryId(9, lastLocationId);

		// Don't set the location on setup if it isn't set yet.
		if (engine.state.qualities.location !== undefined) {
			engine.state.qualities.location = 1;
		}

		// We've only been to the entrance.
		hasBeenToLocation = [true, false, false,
											   false, false, false,
												 false, false, false];
	};

	/* Called when the location of the player changes. Moves the player icon
	 * and sets which tiles are reachable. */
	var updateLocation = function() {
		var locationNumber = engine.state.qualities.location;

		// Set the reachability of the surrounding tiles.
		$(".tile").removeClass('reachable').removeClass('occupied');
		var reachableFromHere = reachableTiles[locationNumber-1];
		for (var i = 0; i < reachableFromHere.length; ++i) {
			$("#tile"+reachableFromHere[i]).addClass('reachable');
		}

		// Move the player.
		var $player = $('#player').detach();
		$("#tile"+locationNumber).append($player).
			addClass('occupied').addClass('reachable');
	};

	/* When we're done with a story chunk, this method hides the story UI. */
	var hideStoryContent = function() {
		$('#content').hide();
		$('#mapContainer').css('opacity', '1.0');
	};

	/* When we have a new story chunk, this method displays the story UI. */
	var showStoryContent = function() {
		$('#content').show();
		$('#mapContainer').css('opacity', '0.5');
	};

	/* This is the way we respond to the dendry state changing. Signals are
	 * sent when the story window has to appear or disappear, and when key
	 * quantities change. */
	var handleSignal = function(signal) {
		switch(signal.signal) {
		case 'cancel':
			if (signal.event === 'scene-arrival') {
				hideStoryContent();
			} else if (signal.event === 'scene-departure') {
				showStoryContent();
			}
			break

		case 'level':
			if (signal.event === 'quality-change') {
				updateLevel();
			}
			break;

		case 'location':
			if (signal.event === 'quality-change') {
				updateLocation();
			}
			break;
		}
	};

	/* Dendry's storytelling UI handles most things the player can choose to
	 * do. The exception is movement between rooms. This is called when a room
	 * is chosen. */
	var handleClickOnTile = function() {
		// We must have no pending story content.
		if ($('#content').is(':hidden')) {
			var $this = $(this);

			// The target must be reachable.
			if ($this.hasClass('reachable')) {
				var tileNumber = parseInt($this.attr('id').substr(4));

				// Set the location on the map.
				engine.state.qualities.location = tileNumber;

				// Tell dendry if we've been here before (we can't use dendry's
				// mechanism for this because that tracks if we've been to a *scene*
				// before, and in this game, multiple rooms may use the same scene).
				engine.state.qualities.known = hasBeenToLocation[tileNumber-1]?1:0;

				// Set the new story scene, if we have one.
				var destinationSceneId = thisLevelSceneIds[tileNumber-1];
				if (destinationSceneId !== null) {
					engine.goToScene(destinationSceneId);					
				}

				// Remember that we've been here.
				if (hasBeenToLocation[tileNumber-1] === false) {
					hasBeenToLocation[tileNumber-1] = true;
					$("#tile"+tileNumber).addClass('visited');
				}
			}
		}
		return false;
	};

	/* We're using the default Dendry UI, except we need to update the map
	 * and the storytelling window when they change. In addition we use this
	 * opportunity to register for any additional UI events that Dendry doesn't
	 * automatically handle. Dendry's default Browser UI calls this right
	 * before beginning a new game. */
	window.dendryModifyUI = function(dendryUI) {
		ui = dendryUI;
		engine = ui.dendryEngine;
		game = ui.game;

		// Find global data from the game.
		findMaximumLevel();
		findLevelScenes();
		findOnePerLevelScenes();

		// Our custom signal handler is the main way we figure out what
		// we need to respond to in the game.
		ui.signal = handleSignal;

		// The only other UI action to handle is clicking on a reachable tile,
		// which should move the player.
		$('.tile').click(handleClickOnTile);
	};
}());