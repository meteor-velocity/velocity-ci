var system = require("system");
var page = require('webpage').create();

page.open(system.args[1], function(status) {
  if (status !== "success") {
    console.log("Unable to access network");
    phantom.exit();
  }
});
