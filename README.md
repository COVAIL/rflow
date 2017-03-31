# Open Source Visual WorkFlow Programming with RStudio and NodeRed (RFlow)

This is the repository for RFlow, connecting RStudio to Visual WorkFlow Programming in NodeRed.  Installation instructions are coming soon.


**Keywords**: NodeJS, NodeRed, R, Rstudio, Flow Programming


**Webpages**: https://github.com/ColumbusCollaboratory/rflow, https://www.nodered.org http://columbuscollaboratory.com/ 


Welcome to the world of drag and drop programming.  NoFlo, Blockly, NiFi, Altryx, SAS Enterprise Miner, and Microsoft Azure Machine Learning have been released as visual workflow programming (VFP) environments to enable rapid iteration and reusability in data analysis and web development.  

NodeRed is an open-source application created with *Javascript* and *NodeJs* that provides an easy to use drag-and-drop development environment, originally purposed by IBM for IoT and web services. The advantage of visual workflow programming is to map your modeling ideas reusable nodes that can then be exposed as web services or easily communicated as a flow of nodes to other team members.  

We are going to demonstrate a RStudio package, **RFlow**, we have created that allows you to to the following:  1) use NodeRed within a viewer inside of RStudio, 2) generate NodeRed nodes from R package functions, 3) generates code from *R* function node flows, and 4) generates node flows from *R* code (a work in process).  Lastly, we will talk about executing *R* inside *NodeJS* versus code generation in NodeRed and how the package can allow you to do either.

