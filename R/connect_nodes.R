

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
  node_port <- "1337"
  args <- paste(
    app, 
    "--comm_port", comm_port,
    "--node_port", node_port,
    "--dir", path
  )
  #if (comm_port != "1338") node_call = paste(node_call, comm_port)
  node_url <- paste("http://127.0.0.1", node_port, sep = ":")
  
  print("before cmd")
  system2(cmd, args, wait = FALSE, stdout = FALSE)
  print("after cmd")
  Sys.sleep(3)
  print("socket")
  con <- socketConnection(host = "127.0.0.1", port = comm_port, open = "r+b")
  print("after socket")
  Sys.sleep(3)
  print("start msg")
  json_in <- rawToChar(readBin(con, raw(), 1e3))
  json_out <- '{"command" : "START_NODERED"}'
  Sys.sleep(3)
  print("start node")
  writeBin(charToRaw(json_out), con)
  print("after start node")
  start_time <- Sys.time()
  wait <- TRUE
  while (wait) {
    print("read node")
    Sys.sleep(3)
    json_in <- fromJSON(rawToChar(readBin(con, raw(), 1e3)))
    if (nchar(json_in) == 0) next
    print(json_in)
    if (json_in$message == "LOADED_NODERED") break
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
rflow_send <- function(json_out, con) {
  writeBin(charToRaw(json_out), con)
  invisible(NULL)
}

#' @title JSON Reader
#' @description Receive a JSON Representation of Generated Functions from the NodeRed App
#' @param con Connection object point to node application's tcp server
#' @return Character scalar holding a message in JSON format
rflow_receive <- function(con) {
  json_in <- rawToChar(readBin(con, raw(), 1e5))
  json_in
}


#' @title End RFlow
#' @description Shuts down node-red environment, communication server and
#'   cleans up connection
#' @inheritParams generate_code
#' @return NULL returned invisibly
#' @export
rflow_end <- function(con) {
  json_out <- '{"command" : "STOP_RFLOW"}'
  writeBin(charToRaw(json_out), con)
  close(con)
  invisible(NULL)
}
