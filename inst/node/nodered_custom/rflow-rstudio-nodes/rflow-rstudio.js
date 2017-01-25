module.exports = function(RED) {
    function RStudioOutNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;

        this.on('input', function(msg) {
          //if R_FunctionCalls

RED.events.emit('rstudio-out');
          //if Socket to RStudio
          if(RED.settings.get('rstudio_comm_socket')){
            RED.settings.get('rstudio_comm_socket').write('INPUT RECEIVED... SENDING OFF');
          }



        });
    }
    RED.nodes.registerType("rstudio-out",RStudioOutNode);

    function RStudioInNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        //if Socket to RStudio

        //if command sent to RStudio-In then execute input

        this.on('input', function(msg) {



        });
    }
    RED.nodes.registerType("rstudio-in",RStudioInNode);
}
