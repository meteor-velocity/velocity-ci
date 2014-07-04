#!/usr/bin/env node
var spawn = require('child_process').spawn;
var fs = require('fs');
var path = require('path');
var childProcess = require('child_process')
var phantomjs = require('phantomjs')
var DDPClient = require("ddp");


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

//`$ velocity --help` translates to [ 'node', '/usr/local/bin/velocity', '--help' ]
//remove the first two arguments then pass off to meteor
var meteorArgs = process.argv.slice(2,process.argv.length);
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

var ddpclient = new DDPClient({
  host: "localhost",
  port: 3000,
  /* optional: */
  auto_reconnect: true,
  auto_reconnect_timer: 500,
  use_ssl: false,
  maintain_collections: true // Set to false to maintain your own collections.
});

ddpclient.connect(function(error) {
  // If auto_reconnect is true, this callback will be invoked each time
  // a server connection is re-established
  if (error) {
    console.log('DDP connection error!');
    return;
  }

  ddpclient.subscribe(
    'VelocityTestReports',
    [],                       // any parameters used by the Publish function
    function () {             // callback when the subscription is complete
    }
  );

  ddpclient.subscribe(
    'VelocityAggregateReports',
    [],
    function () {
    }
  );

  ddpclient.on('message', function (rawMsg) {
    var msg = JSON.parse(rawMsg);
    // console.log("MSG", msg);

    //display passing and failing tests
    if (msg.msg == "added" && msg.collection =="velocityTestReports"){
      var testDesc = msg.fields.framework + " : " + msg.fields.ancestors.join(":") + " => " + msg.fields.name;
      if(msg.fields.result == "passed"){
        console.log("PASSED ", testDesc);
      } else if (msg.fields.result == "failed"){
        console.log("FAILED ", testDesc);
        console.log(msg.fields.failureStackTrace)
      }
    }

    //exit a few seconds after receiving aggregate results
    if ((msg.msg == "added" || msg.msg == "changed") && msg.collection == "velocityAggregateReports"){
      // console.log("MSG", msg);
      var aggregateReports = ddpclient.collections.velocityAggregateReports;
      var isFinished = null;
      var finalResult = null;
      Object.keys(aggregateReports).forEach(function(reportKey){
        var report = aggregateReports[reportKey];
        if (report.name == "aggregateComplete")
          isFinished = report.result == "completed";
        if (report.name == "aggregateResult")
          finalResult = report.result;
      });
      if (isFinished){
        meteor.kill("SIGTERM");
        setTimeout(function(){
          if (finalResult == "passed"){
            console.log("TESTS RAN SUCCESSFULLY :-)")
            process.exit(0);
          }
          if (finalResult == "failed"){
            console.log("FAILURE :-(");
            process.exit(1);
          }
        }, 2000);
      }
    }
  });
});


setTimeout(function(){
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
