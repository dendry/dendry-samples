Descend
=======

Descend is a randomly generated dungeon-crawling adventure, showing how
the Dendry choice-based story game play can be easily mixed with other
gameplay elements.

Each level of the dungeon consists of a grid of 3x3 rooms, with the stairs
down in the opposite corner to where you start. You can click an adjacent 
room to move to it. Each room may have further story or choices to make.

The game uses custom Javascript that augments and modifies how Dendry works
to implement the additional game logic.

Build it into HTML form with:

    $ dendry make-html descend

Note, you must use the default template, because this game assumed that the
default layout is used, and has overridden some of the files already in the
out/html directory. Don't use --overwrite, as it will delete this code.

Once it is made, you can view it with your browser, e.g.

    $ google-chrome descend/out/html/index.html
