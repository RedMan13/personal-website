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
## `.precomp.js` files
this file extension dictates a file to be used for transpiling certain files ahead of time, allowing for things like e4x or jsx to be added into the dealt code easily without needing to compile the whole thing

the executors for these files lives inside [`api/url-preprocessor.js`](https://github.com/redman13/personal-website/master/api/url-preprocessor.js#L40)

here is a list of all currently implemented precomp files
| filename            | file filter | purpose                                                                                                          |
|---------------------|-------------|------------------------------------------------------------------------------------------------------------------|
| eventtitled-scripts | html,php    | allows you to set a an event that a script element should listen too                                             |

the util class can be found inside [`api/precomp-utils.js`](https://github.com/redman13/personal-website/master/api/precomp-utils.js) and is reused accross a single file
every .precomp.js file is expected to export a function who when run, will first verify that the file is applicable to this precomp, to say that this precomp is not applicable you simply return a truthy value, returning a falsey value will result in the executor assuming that you did something with the util

## running/testing
simply cd into the `api` directory then run `node .` and the node server will startup from there
