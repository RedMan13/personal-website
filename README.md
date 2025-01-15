i have been putting off putting this on github cause i wann a try making that stuff on myown
but this is much better for things like coloberation

# my website of websiteing!!!!!!!!!!!!
just a funky little site for my funky little internet sharing things

# system documention
## build exclusions
see `.buildignore` for a list of all files, files are matched via regex
## `preprocessors/*.prepcomp.js` files
these files transpile certain files ahead of time, allowing for things like e4x or jsx to be added into the dealt code.

here is a list of all currently implemented precomp files
| title name | file filter | purpose |
| --- | --- | --- |
| eventtitled-scripts | html php              | allows you to set a an event that a script element should listen too |
| constant-php        | const.php             | allows for php to be used in the building process |
| html-templating     | html php              | allows you to make a head design thats shared amongst many different pages come from a single source |
| markdown            | md                    | adds support for markdown text files |
| html-script-interop | html php              | allows for html script blocks to embed other supported code types, such as jsx |
| imported-fixings    | html php (js mjs cjs) | fixes import statements so they resolve to the correct files in publish |
| javascript-xml      | jsx                   | implements a javascript xml compiler |
| protobuf-file       | proto                 | implements the protobuf compiler |

the util class can be found inside [`builder/precomp-utils.js`](https://github.com/redman13/personal-website/main/builder/precomp-utils.js) and is reused accross a single file
every .precomp.js file is expected to export a function who when run, will first verify that the file is applicable to this precomp, to say that this precomp is not applicable you simply return a truthy value, returning a falsey value will result in the executor assuming that you did something with the util and so saving the utils data into the operating file.

## building/testing
to make a new build run `npm run build`
to start the dev server run `npm start` or `npm run dev`
