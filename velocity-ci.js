#!/usr/bin/env node
var spawn = require('child_process').spawn;
var fs = require('fs');
var path = require('path');
var childProcess = require('child_process')
var phantomjs = require('phantomjs')


function projectRoot(directory){
  //go up the directory tree until we see a .meteor folder
  if (!directory){
    directory = process.cwd();
  }
  var contents = fs.readdirSync(directory);
  if (contents.indexOf(".meteor") != -1){
    return directory;
  } else {
    return projectRoot(path.join(directory, ".."));
  }
}

var root = projectRoot();
process.chdir(root);

if (process.argv.indexOf('--test') != -1){
  console.log("TODO Subscribe to test reports and exit with the appropriate status code");
}

var meteorArgs = process.argv.filter(function(element){
  return element !== "--test";
});

//`$ velocity --help` translates to [ 'node', '/usr/local/bin/velocity', '--help' ]
//remove the first two arguments then pass off to meteor
meteorArgs = meteorArgs.slice(2,meteorArgs.length);
var meteor = spawn("meteor", meteorArgs);

meteor.on("close", function(code, signal){
  console.log('Meteor process terminated due to receipt of signal '+signal,
    " with code ", code);
});

meteor.stdout.on('data', function (data) {
  process.stdout.write(data);
});

meteor.stderr.on('data', function (data) {
  process.stderr.write(data);
});

//start DDP connection to Meteor server
//once mirror is ready, visit it

setTimeout(function(){
  console.log("Visiting MIRROR");
  visitMirror('http://localhost:5000');
}, 10000);

function visitMirror(mirrorUrl){
  var binPath = phantomjs.path

  var childArgs = [
    path.join(__dirname, 'phantom-script.js'), mirrorUrl
  ];

  childProcess.execFile(binPath, childArgs, function(err, stdout, stderr) {
    if (err){
      console.error("PHANTOM ENCOUNTERED ERROR LOADING", mirrorUrl, err);
    }
    console.log(stdout);
    if (stderr){
      console.error("PHANTOM STDERR:", stderr);
    }
  });
}
