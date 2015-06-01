(function() {
	var game;
	var engine;
	var ui;

	var maxLevel = 2;
	var scenesValidPerLevel;
	var onePerLevelSceneIds;

	var reachableTiles = [
		[2,4], [1,3,5], [2,6], [1,5,7], [2,4,6,8], [3,5,9], [4,8], [5,7,9], [6,8]
		];

	var thisLevelSceneIds;
	var hasBeenToLocation;

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

	var findOnePerLevelScenes = function() {
		onePerLevelSceneIds = game.tagLookup['one-per-level'];
		if (onePerLevelSceneIds === undefined) onePerLevelSceneIds = {};
	};

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

	var setBackgroundImage = function($tile, imageName) {
		if (imageName) {
			$tile.css('background-image', "url('img/"+imageName+".png')");
		} else {
			$tile.css('background-image', 'none');
		}
	};

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

	var updateLevel = function() {
		var levelNumber = engine.state.qualities.level;

		thisLevelSceneIds = [null, null, null, null, null, null, null, null, null];

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

		hasBeenToLocation = [true, false, false,
											   false, false, false,
												 false, false, false];
	};

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

	var hideStoryContent = function() {
		$('#content').hide();
		$('#map').css('opacity', '1.0');
	};

	var showStoryContent = function() {
		$('#content').show();
		$('#map').css('opacity', '0.5');
	};

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

	var main = function(dendryUI) {
		ui = dendryUI;
		engine = ui.dendryEngine;
		game = ui.game;

		// Find global data from the game.
		findLevelScenes();
		findOnePerLevelScenes();

		// Our custom signal handler is the main way we figure out what
		// we need to respond to in the game.
		ui.signal = handleSignal;

		// The only other UI action to handle is clicking on a reachable tile.
		$('.tile').click(handleClickOnTile);
	};

	window.dendryModifyUI = main;
}());