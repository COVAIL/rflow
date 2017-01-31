var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require("path");
var argv = require('yargs').argv;

var getDirName = path.dirname;
var replacePeriod = "JS_XX_JS";
var replaceId = "JS_id_JS";


var user_directory = argv.dir || "./";
var node_port = argv.node_port || 1337;
var comm_port = argv.comm_port || 1338;
var ip_address = argv.ip_address || '127.0.0.1';

var eventsPath = path.resolve(user_directory, "node_modules/node-red/red/runtime/events");
var events = require(eventsPath.toString());

var ERROR_CODE = "ERROR_CODE";

function RtoJS(argName){
  var JSname = argName;
  if(argName == 'id'){
    return replaceId;
  }
  JSname = argName.split(".").join(replacePeriod);
  return JSname
}
function JStoR(jsArgName){
  var argName = jsArgName;
  if(jsArgName == replaceId){
    return "id";
  }
  argName = jsArgName.split(replacePeriod).join(".");
  return argName;
}

var http = require('http');
var express = require("express");
var RED = require("node-red");

var net = require('net');

var comm_socket;


var tcp_server = net.createServer(function(socket) {
  var msg = '';
  comm_socket = socket;
  socket.write("Hello, I am the RFlow TCP Server. I like to talk JSON.")
  socket.on('error', function(data){
    console.log('ERROR::RECEIVED DATA::'+ data);
    writeComm('ERROR::'+data);
  });
	socket.on('data', function(data){

    if(typeof data == 'object'){
      try{
          var recv = JSON.parse(data.toString().trim());
          switch(recv.command) {
              case 'START_NODERED':
                  // Start the nodered runtime
                  RED.start().then(
                    function(){
                      writeComm('LOADED_NODERED');
                      events.on('rstudio-out', function(msg){
                          writeComm(msg);
                      })
                    }
                  );
                  break;
              case 'STOP_RFLOW':
                  writeComm('Received STOP_RFLOW command.  Good Bye!');
                  process.exit();
                  break;
              case 'RUN_FLOWS':
                  writeComm('Received RUN_FLOWS command.');
                  var node_names = [];
                  if(recv.node_names){
                    node_names = recv.node_names;
                  }
                  events.emit('rstudio-in', {"node_names":node_names});
                  break;
              case 'GENERATE_NODES':
                  writeComm('Received GEN_NODES command.');
                  if(recv.module){
                    var moduleName = recv.module.name;
                    var modulePath = path.join(user_directory,moduleName);
                    if(RED.nodes.getModuleInfo(moduleName) != null){
                      //uninstall doesn't work probably because of the userDir up one dir having the node_modules.
                      RED.nodes.uninstallModule(moduleName).then(
                        function(){
                          createNodes(recv.module, function(){
                            RED.nodes.installModule(modulePath);
                            writeComm('Installed Module:'+modulePath);
                          })
                        }
                      )
                    } else {
                      createNodes(recv.module, function(){
                        RED.nodes.installModule(modulePath);
                        writeComm('Installed Module:'+modulePath);
                      });
                    }
                    writeComm('Generated new NodeRed Nodes in Directory');
                  } else {
                    writeComm('Please provide a module JSON object in the JSON message', ERROR_CODE);
                  }
                  break;
              default:
                 writeComm("Don't know what to do with this command, "+recv.commadn, ERROR_CODE);
            }
      }catch(ex){
        console.log(ex);
        writeComm(ex.message, ERROR_CODE);
      }
    } else {
      writeComm("Please send a JSON Object, and command", ERROR_CODE);
    }
  });
});


tcp_server.listen(comm_port, ip_address);

function writeComm(comm_text, code){
  if(comm_socket){
    var msg = {}
    msg.code = code || "INFO";
    msg.message = comm_text;
    comm_socket.write(JSON.stringify(msg));
  }
}


// Create an Express app
var app = express();

// Add a simple route for static content served from 'public'
app.use("/",express.static("public"));

// Create a server
var server = http.createServer(app);

// Create the settings object - see default settings.js file for other options
var settings = {
    httpAdminRoot:"/",
    httpNodeRoot: "/api",
    userDir:user_directory,
    functionGlobalContext: { }    // enables global context
};

// Initialise the runtime with a server and settings
RED.init(server,settings);

// Serve the editor UI from /red
app.use(settings.httpAdminRoot,RED.httpAdmin);

// Serve the http nodes UI from /api
app.use(settings.httpNodeRoot,RED.httpNode);

server.listen(node_port);






function createNodes(functionPackage, callback){

  function writeFile(path, contents, cb) {

    mkdirp(getDirName(path), function (err) {

      //Need to define callbak if not defined;
      //(node:20213) DeprecationWarning: Calling an asynchronous function without callback is deprecated.
      if(!cb){
        cb = function(){}
      }
      if (err) return cb(err);

      fs.writeFile(path, contents, cb);
    });
  }

  var nodesDir = "./"+functionPackage.name;


  functionPackage.nodes.forEach(function(func){
    writeFile(nodesDir+"/"+func.category+"/"+func.category+"-"+RtoJS(func.name)+".html", getNodeHTMLTemplate(func));
    writeFile(nodesDir+"/"+func.category+"/"+func.category+"-"+RtoJS(func.name)+".js", getNodeJSTemplate(func));
  });
  /*
  var htmlOutput = "";
  var jsOutput = "";
  functionPackage.funcs.forEach(function(func){
    htmlOutput += getNodeHTMLTemplate(func) + '\n\n\n';
    jsOutput += getNodeJSTemplate(func) + '\n\n\n';
  });

  writeFile(nodesDir+"/"+functionPackage.category+".html", htmlOutput);
  writeFile(nodesDir+"/"+functionPackage.category+".js", jsOutput);
  */
  var packageJSON = getNodePackageJSON(functionPackage);
  writeFile(nodesDir+"/"+"package.json", packageJSON , function(){
    if(callback){
      callback();
    }
  });

}

function getNodeHTMLTemplate(f){

  var output = "";
  output += `
  <script type="text/javascript">

      var `+RtoJS(f.name)+`_DEFAULT_VALUES = {
        `
        f.args.forEach(function(arg, idx){
          if(idx > 0){
          output += ',';
          }
          output += '"'+RtoJS(arg.name) + '":"'+((typeof arg.defaultValue == 'string')?arg.defaultValue.split('\"').join('\\\"'):arg.defaultValue)+'"';
        });

        output += `
      }


      function makeExpression`+RtoJS(f.name)+`(`;

        f.args.forEach(function(arg, idx){
          output += '_'+RtoJS(arg.name) + ',';
        });
        output += '_OUTPUT_VAR';

  output += "){\n";
  output += `
        var args = [];
  `
  f.args.forEach(function(arg, idx){
    output += `
    if(typeof _`+RtoJS(arg.name)+` != 'undefined' && _`+RtoJS(arg.name)+` != ''){
      args.push({"name":"`+arg.name+`", "value":_`+RtoJS(arg.name)+`});
    }
    `
  });

  output += `var func = {};
  func.R_Function = true;
  func.args = args;
  func.name = "`+f.name+`";
  `
  output += `
  if(typeof _OUTPUT_VAR != 'undefined' && _OUTPUT_VAR != ''){
    func.outputVar=_OUTPUT_VAR;
  } else {
    func.outputVar = "`+f.name+`_OUTPUT";
  }
  return JSON.stringify(func);
  `

  /*

  output += "\t\t\tvar functionCall = \""+f.name+"_OUTPUT <- "+f.name+`(\"
    variables.forEach(function(variable, idx){
      if(idx > 0){
        functionCall += ", "
      }
      functionCall += variable.name+" = "+variable.value
    });
  return functionCall + ")"
  `
  */
  output +=    "\n\t}";
  output += `
    RED.nodes.registerType('`+f.category+`-`+RtoJS(f.name)+`',{
        category: \"`+f.category+`\",
        color: '#fdd0a2',
        defaults: {
            name: {value:""},
            `;
  f.args.forEach(function(arg, idx){
    output += "\t\t\t\t"+RtoJS(arg.name)+":{value:\""+((typeof arg.defaultValue == 'string')?arg.defaultValue.split('\"').join('\\\"'):arg.defaultValue)+"\"},\n";
  });
  output += `   outputVar: {value:"`+f.name+`_OUTPUT_VAR"},
              rcode: {value:""},
              outputs: {value:1},
              noerr: {value:0,required:true,validate:function(v){ return ((!v) || (v === 0)) ? true : false; }}
          },
          inputs:1,
          outputs:1,
          icon: "`+f.category+`.png",
          label: function() {
          return this.name||"`+f.category+`-`+RtoJS(f.name)+`";
          },
          oneditprepare: function() {
          var node = this;
          $( "#node-input-outputs" ).spinner({
              min:1
          });

          if($('#node-input-rcode').val() == ""){
              $('#node-input-rcode').val(makeExpression`+RtoJS(f.name)+`(`
                f.args.forEach(function(arg, idx){
                if(idx > 0){
                output += ',';
                }
                output += " $('.arg-input."+RtoJS(arg.name)+"').val()";
                });
                output += ", $('.arg-input.outputVar').val()"

                output += '));'

            output += `
            $('.form-tips .generated-code').text($('#node-input-rcode').val());
            node.rcode = $('#node-input-rcode').val();
          }

          $('.arg-input').on('keyup', function(evt){
            $('#node-input-rcode').val(makeExpression`+RtoJS(f.name)+`(`
  f.args.forEach(function(arg, idx){
    if(idx > 0){
      output += ',';
    }
    output += " $('.arg-input."+RtoJS(arg.name)+"').val()";
  });
  output += ", $('.arg-input.outputVar').val()"

  output += '));'

  output += `
          $('.form-tips .generated-code').text($('#node-input-rcode').val());
          node.rcode = $('#node-input-rcode').val();
        });


        },
        oneditsave: function() {
          this.rcode = $('#node-input-rcode').val();
        },
        oneditresize: function(size) {

        }
      });
      </script>

      <script type="text/x-red" data-template-name="`+f.category+`-`+RtoJS(f.name)+`">
        <div class="form-row">
        <label for="node-input-name"><i class="fa fa-tag"></i> <span data-i18n="common.label.name"></span></label>
        <input type="text" id="node-input-name" data-i18n="[placeholder]common.label.name">
        <input type="hidden" id="node-input-rcode" value="">
        </div>
  `

  f.args.forEach(function(arg, idx){

    output += `
        <div class="form-row" style="margin-bottom: 0px;">
        <label for="node-input-`+RtoJS(arg.name)+`"><i class="fa fa-wrench"></i> <span>`+arg.name+`</span></label>
        <input type="text" id="node-input-`+RtoJS(arg.name)+`" class="arg-input `+RtoJS(arg.name)+`" />
        </div>
    `

  });

  output += `
      <div class="form-row" style="margin-bottom: 0px;">
      <label for="node-input-outputVar"><i class="fa fa-wrench"></i> <span>outputVar</span></label>
      <input type="text" id="node-input-outputVar" class="arg-input outputVar"/>
      </div>
  `

  output += `
        <div class="form-row">
        <label for="node-input-outputs"><i class="fa fa-random"></i> <span data-i18n="function.label.outputs"></span></label>
        <input id="node-input-outputs" style="width: 60px;" value="1">
        </div>
        <div class="form-tips"><span>See the Info tab for help writing R functions in NodeRed.<p><code class="generated-code"></code></p></span></div>
      </script>

      <script type="text/x-red" data-help-name="`+f.category+`-`+RtoJS(f.name)+`">
        `+f.doc+`
      </script>

  `
  return output;
}

function getNodeJSTemplate(f){
  var output = `
  module.exports = function(RED) {

      function `+RtoJS(f.name)+`Function(config) {
          RED.nodes.createNode(this,config);
          var node = this;
          node.name = config.name;
          if(config.rcode.trim() == ""){
            jsonPayload = {
              "R_Function":true,
              "name":"`+f.name+`",
              "outputVar":"`+f.name+`_OUTPUT_VAR",
              "args":[
                `
              f.args.forEach(function(arg, idx){
                if(idx > 0){
                  output += ',';
                }
                output += `{ "name":"`+arg.name+`",
                           "value":"`+((arg.defaultValue !="" && typeof arg.defaultValue === 'string')?arg.defaultValue.split('"').join("\\\""):arg.defaultValue)+`" }`
              });
              output += ` ]};

              node.rcode = JSON.stringify(jsonPayload);
            } else {
              node.rcode = config.rcode;
            }

          this.on('input', function(msg) {
            console.log(1);
            if(typeof node.rcode == 'string'){
              console.log(2);
              if(node.rcode.indexOf('{') >= 0){
                try{
                  console.log(3);
                  jsonPayload = JSON.parse(node.rcode);
                  console.log(4);
                  if(typeof jsonPayload.R_Function != "undefined"  && jsonPayload.R_Function){
                    console.log(5);
                    var code = jsonPayload;
                    if(typeof msg.R_FunctionCalls == 'undefined'){
                      console.log(6);
                      msg.R_FunctionCalls = {};
                      msg.R_FunctionCalls.funcs = [];
                    }
                    console.log(7);
                    msg.R_FunctionCalls.funcs.push(code);
                    node.send(msg);
                    console.log(8);
                  } else {
                    node.error("R_Function is not defined on object?");
                  }
                } catch(err) {
                  node.error("Unable to convert node.rcode to JSON object");
                  node.error(err)
                }
              } else {
                node.error("Not a JSON string");
              }
            } else {
              node.error("node.rcode is not typeof 'string'")
            }
            console.log(9);
          });
      }
      RED.nodes.registerType("`+f.category+`-`+RtoJS(f.name)+`",`+RtoJS(f.name)+`Function);
  }
    `

  return output;
}

function getNodePackageJSON(functionPackage){

  var output = `
  {
    "dependencies": {},
    "description": \"`+functionPackage.description+`\",
    "devDependencies": {},
    "name": "`+functionPackage.name+`",
    "node-red": {
      "nodes": {
        `
        functionPackage.nodes.forEach(function(func, idx){
          if(idx > 0){
            output += ',';
          }
          output += `\"`+func.category+`-`+RtoJS(func.name)+`\":\"`+func.category+`/`+func.category+`-`+RtoJS(func.name)+`.js\"\n`
        });
        /*
        output += `\"`+functionPackage.category+`\":\"`+functionPackage.category+`.js\"\n`
        */
    output += `
      }
    },
    "optionalDependencies": {},
    "readme": "`+functionPackage.description+`",
    "readmeFilename": "README.md",
    "version": "`+functionPackage.version+`"
  }
  `
  return output;
}
