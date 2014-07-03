#!/usr/bin/env node
var spawn = require('child_process').spawn;
var fs = require('fs');
var path = require('path');

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
var mochaWebTestDir = path.join(root, "tests", "mocha-web");
var tmpMochaWebTests = path.join(root, "tmpMochaWebTests");

function createSymlinks(){
  //does `myProject/tests/mocha-web` exist?
  if (fs.existsSync(mochaWebTestDir)){
    console.log("creating symlink to mocha-web tests");
    if (fs.existsSync(tmpMochaWebTests)){
      return
    } else {
      fs.symlinkSync(mochaWebTestDir, tmpMochaWebTests);
    }
  }
}

function removeSymlinks(){
  if (fs.existsSync(tmpMochaWebTests)){
    fs.unlinkSync(tmpMochaWebTests);
  }
}

if (process.argv.indexOf('--test') != -1){
  console.log("TODO Subscribe to test reports and exit with the appropriate status code");
}

var meteorArgs = process.argv.filter(function(element){
  return element !== "--test";
});

createSymlinks();

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

process.on('uncaughtException', function(err) {
  removeSymlinks();
  throw err;
});

process.on('SIGINT', function(){
  removeSymlinks();
  process.exit(1);
});

process.on('SIGTERM', function(){
  removeSymlinks();
  process.exit(1);
});
