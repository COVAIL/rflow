

#' @title Start RFlow
#' @description Takes app and communication ports to start
#' @param viewer Logical scalar determining whether to open the node-red environment
#'   in the Rstudio viewer or a browser window
#' @param node_port Character scalar giving node-red environment port
#' @param comm_port Character scalar giving communication server port
#' @return Connection object for the communication server 
#' @importFrom rstudioapi viewer
#' @export
rflow_start <- function(viewer = TRUE, comm_port = "1338") {
  cwd <- getwd()
  path <- system.file("node/nodered_custom", package = "nodegen")
  setwd(path)
  cmd <- "node"
  app <- file.path(path, "rflow.js")
  args <- c(app, comm_port)
  #if (comm_port != "1338") node_call = paste(node_call, comm_port)
  node_url <- "http://127.0.0.1:1337"
  
  system2(cmd, args, wait = FALSE, stdout = FALSE)
  Sys.sleep(.5)
  con <- socketConnection(host = "127.0.0.1", port = comm_port, open = "r+b")
  start_cmd <- '{"command" : "START_NODERED"}'
  writeBin(charToRaw(start_cmd), con)
  start_time <- Sys.time()
  wait <- TRUE
  while (wait) {
    con_status <- rawToChar(readBin(con, raw(), 1e3))
    if (con_status == "LOADED_NODERED") break
    if (as.double(Sys.time() - start_time) > 10) 
      return(message("Unable to start NodeRed"))
  }
  if (viewer) viewer(node_url) else getOption("browser")(node_url)
  setwd(cwd)
  con
}

#' @title JSON Writer
#' @description Send a JSON Representation of User-facing Functions to the NodeRed App
#' @param pkg_nodes Character scalar holding JSON representation of nodes
#' @param con Connection object point to node application's tcp server
#' @return NULL invisibly
#' @export
send_nodes <- function(tcp_msg, con) {
  writeBin(charToRaw(tcp_msg), con)
  invisible(NULL)
}

#' @title JSON Reader
#' @description Receive a JSON Representation of Generated Functions from the NodeRed App
#' @param con Connection object point to node application's tcp server
#' @return Character scalar holding a message in JSON format
#' @export
receive_nodes <- function(con) {
  tcp_msg <- rawToChar(readBin(con, raw(), 1e5))
  tcp_msg
}


#' @title End RFlow
#' @description Shuts down node-red environment, communication server and
#'   cleans up connection
#' @inheritParams generate_code
#' @return NULL returned invisibly
#' @export
rflow_end <- function(con) {
  end_cmd <- '{"command" : "STOP_RFLOW"}'
  writeBin(charToRaw(end_cmd), con)
  close(con)
  invisible(NULL)
}
