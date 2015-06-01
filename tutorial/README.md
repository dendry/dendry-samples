![Dendry](http://dendry.org/img/logo_64.png) Dendry Tutorial
======

A game that describes the features of Dendry in an interactive book
format. Build it into HTML form with:

    $ dendry make-html tutorial

and view with your browser, e.g.

    $ google-chrome tutorial/out/html/index.html

Because this game doesn't use any additional logic, other than the basic
Dendry game engine, it can also be built into a HTML file with the 'onepage'
template:

    $ dendry make-html tutorial -t onepage