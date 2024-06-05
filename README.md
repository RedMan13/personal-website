i have been putting off putting this on github cause i wann a try making that stuff on myown
but this is much better for things like coloberation

# my website of websiteing!!!!!!!!!!!!
just a funky little site for my funky little internet sharing things

# projects to be migrated
all of the menguinjod folder is a bunch of scratch-related projects that have no direct relation to this website but are hosted on this website

new-scratch/ is a from-the-ground-up rewrite of the scratch engine

pmp-newform.js needs to be merged into the pm code base

import-tests.php was made for loading in pmp-newform.js

test-save.zip is a save file for testing purposes; made and used by pmp-newform.js

# system documention
## default ignored files
- `.git`
- `.gitignore`
- `.buildignore`
- `node_modules`
- `package-lock.json`
- `package.json`
- `build`
- `preprocessors`
## `.server.js` files
an unimplemented system for writing in a nodejs server end point, these files are expected to export a single function that gets run when the files path is called in the url.
## `.const.php` files
these files are built once and served always either as the ext defined before the `.const.php` or as the ext `.html`
## `preprocessors/*.prepcomp.js` files
these files transpile certain files ahead of time, allowing for things like e4x or jsx to be added into the dealt code easily.

here is a list of all currently implemented precomp files
| filename | file filter | purpose |
| --- | --- | --- |
| eventtitled-scripts | html php | allows you to set a an event that a script element should listen too |
| ecma-for-xml | html php js | implements ECMAScript for XML ontop of the existing js |

the util class can be found inside [`builder/precomp-utils.js`](https://github.com/redman13/personal-website/main/builder/precomp-utils.js) and is reused accross a single file
every .precomp.js file is expected to export a function who when run, will first verify that the file is applicable to this precomp, to say that this precomp is not applicable you simply return a truthy value, returning a falsey value will result in the executor assuming that you did something with the util and so saving the utils data into the operating file.

## running/testing
to make a full build simply run the `builder` folder with `node` while outside the `builder` folder (`pwd=./personal-website`), for running as a dev server do the same thing but change the target to `dev-api`, the url on which the dev page is hosted will be given in the console. 