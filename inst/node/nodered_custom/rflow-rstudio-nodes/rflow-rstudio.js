  module.exports = function(RED) {
    function RStudioOutNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        node.name = config.name || "rstudio-out";

        this.on('input', function(msg) {

          if(typeof msg.RIn_NodeName != 'undefined'){
            msg.R_FunctionCalls.RIn_NodeName = msg.RIn_NodeName;
          }
          if(typeof msg.RIn_NodeId != 'undefined'){
            msg.R_FunctionCalls.RIn_NodeId = msg.RIn_NodeId;
          }
          if(typeof msg.RIn_RunUuid != 'undefined'){
            msg.R_FunctionCalls.RIn_RunUuid = msg.RIn_RunUuid;
          }
          msg.R_FunctionCalls.ROut_NodeName = node.name;
          msg.R_FunctionCalls.ROut_NodeId = node.id;
          RED.events.emit('rstudio-out', msg.R_FunctionCalls);

        });
    }
    RED.nodes.registerType("rstudio out",RStudioOutNode);

    function RStudioInNode(config) {
        RED.nodes.createNode(this,config);
        this.rstudioConfig = RED.nodes.getNode(config.rstudioConfig);
        var node = this;
        node.name = config.name || "rstudio-in";
        node.rstudioConfig.addRStudioIn(node);
        // Retrieve the config node

        //if Socket to RStudio
        //if command sent to RStudio-In then execute input
        node.on('input', function(msg) {

          msg.RIn_NodeName = node.name;
          msg.RIn_NodeId = node.id;
          node.send(msg);
        });
    }
    RED.nodes.registerType("rstudio in",RStudioInNode);

    function RStudioConfig(n) {
        var runs = {};

        RED.nodes.createNode(this,n);
        var configNode = this;
        configNode.nodeNames = [];
        configNode.addRStudioIn = function(in_node){
          configNode.nodeNames.push(in_node);
        }
        if(RED.events.listenerCount('rstudio-in') == 0){
          RED.events.on('rstudio-in', function(in_msg){
            var run = {};
            run.uuid = require('node-uuid').v4();
            run.start = new Date().toISOString();
            run.flowNames = in_msg.node_names || [];
            if(run.flowNames.length == 0){
              for(var j=0;j<configNode.nodeNames.length; j++){
                  run.flowNames.push(configNode.nodeNames[j].name)
              }
            }
            runs[run.uuid] = run;
            var foundFlow = false;
            var processedFlows = [];
            for(var x=0;x<configNode.nodeNames.length;x++) { processedFlows.push(false); }

            for(var i=0;i<run.flowNames.length;i++){
              foundFlow = false;
              var flowMsg = JSON.parse(JSON.stringify(in_msg));
              for(var j=0;j<configNode.nodeNames.length; j++){
                if(!processedFlows[j] && run.flowNames[i] == configNode.nodeNames[j].name){
                  foundFlow = true;
                  processedFlows[j] = true
                  flowMsg.RIn_RunUuid = run.uuid;
                  configNode.nodeNames[j].emit('input', flowMsg);
                  break;
                }
              }
              if(!foundFlow){
                throw new Error("Flow not found? "+run.flowNames[i]);
              }
            }

          });
        }

        if(RED.events.listenerCount('rstudio-out') == 0){
          RED.events.on('rstudio-out', function(out_msg){
            if(typeof out_msg.RIn_RunUuid != 'undefined'){
              if(typeof runs[out_msg.RIn_RunUuid].flowNamesReceived == 'undefined'){
                runs[out_msg.RIn_RunUuid].flowNamesReceived = [];
                runs[out_msg.RIn_RunUuid].outMessages = [];
              }
              runs[out_msg.RIn_RunUuid].flowNamesReceived.push(out_msg.RIn_NodeName);
              runs[out_msg.RIn_RunUuid].outMessages.push(out_msg);
              if(runs[out_msg.RIn_RunUuid].flowNamesReceived.length == runs[out_msg.RIn_RunUuid].flowNames.length){
                var returnFlows = [];
                var orderedFlows = runs[out_msg.RIn_RunUuid].flowNames;
                var processedFlows = [];

                for(var i=0;i<orderedFlows.length;i++) { processedFlows.push(false); }


                runs[out_msg.RIn_RunUuid].outMessages.forEach(function(outMsg){
                  for(var i=0;i<orderedFlows.length; i++){
                    if(orderedFlows[i] == outMsg.RIn_NodeName && !processedFlows[i]){
                      returnFlows[i] = outMsg;
                      processedFlows[i] = true;
                      break;
                    }
                  }
                });

                RED.events.emit('rflow-out', returnFlows);
                delete runs[out_msg.RIn_RunUuid]
              }
            } else {
              var out = [];
              out.push(out_msg);
              RED.events.emit('rflow-out', out);
            }


          });
        }



    }
    RED.nodes.registerType("rstudio config",RStudioConfig);

}
