(function() {
	var game;
	var engine;
	var ui;

	var maxLevel = 1;
	var scenesValidPerLevel;
	var onePerLevelSceneIds;

	var reachableTiles = [
		[2,4], [1,3,5], [2,6], [1,5,7], [2,4,6,8], [3,5,9], [4,8], [5,7,8], [6,8]
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

	var updateLevel = function() {
		var levelNumber = engine.state.qualities.level;

		console.log("Beginning level "+levelNumber);

		var random = ui.dendryEngine.random;
		var validScenes = scenesValidPerLevel[levelNumber-1];

		thisLevelSceneIds = [null];
		for (var i = 2; i < 9; ++i) {
			var thisSceneIndex = random.uint32() % validScenes.length;
			var thisSceneId = validScenes[thisSceneIndex];
			if (onePerLevelSceneIds[thisSceneId]) {
				validScenes.splice(thisSceneIndex, 1);
			}
			thisLevelSceneIds.push(thisSceneId);

			// Change the corresponding tile appearance.
			$('#tile'+i).html(thisSceneId);
		}
		thisLevelSceneIds.push(null);

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
		console.log("Moving to "+locationNumber);

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

		// Set the reachability now.
		hasBeenToLocation[locationNumber-1] = true;
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
		console.log(JSON.stringify(signal));
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