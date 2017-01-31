module.exports = function(RED) {
    function RStudioOutNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        node.name = config.name || "rstudio-out";

        this.on('input', function(msg) {
          //if R_FunctionCalls
          RED.events.emit('rstudio-out', msg.R_FunctionCalls);

        });
    }
    RED.nodes.registerType("rstudio out",RStudioOutNode);

    function RStudioInNode(config) {
        RED.nodes.createNode(this,config);
        this.rstudioConfig = RED.nodes.getNode(config.rstudioConfig);
        var node = this;
        node.name = config.name || "rstudio-in";
console.log(node.rstudioConfig);
console.log(node.rstudioConfig.addRStudioIn)
        node.rstudioConfig.addRStudioIn(node);
        // Retrieve the config node

        //if Socket to RStudio
        //if command sent to RStudio-In then execute input
        node.on('input', function(msg) {
          node.send(msg);
        });
    }
    RED.nodes.registerType("rstudio in",RStudioInNode);

    function RStudioConfig(n) {
        RED.nodes.createNode(this,n);
        var configNode = this;
        configNode.nodeNames = [];
        configNode.addRStudioIn = function(in_node){
          console.log('hello in RStudioIn');
          configNode.nodeNames.push(in_node);
        }
        RED.events.on('rstudio-in', function(in_msg){
          var names = in_msg.node_names || [];
          if(names.length == 0){
            for(var j=0;j<configNode.nodeNames.length; j++){
                configNode.nodeNames[j].emit('input', in_msg);
            }
          } else {
            for(var i=0;i<names.length;i++){
              for(var j=0;j<configNode.nodeNames.length; j++){
                if(names[i] == configNode.nodeNames[j].name){
                  configNode.nodeNames[j].emit('input', in_msg);
                }
              }
            }
          }

        });
    }
    RED.nodes.registerType("rstudio config",RStudioConfig);

}
