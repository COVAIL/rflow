

#' holds connection object
cache <- new.env()

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
  system2(cmd, args, wait = FALSE, stdout = "")
  print("after cmd")
  Sys.sleep(2) # maybe while loop
  print("socket")
  con <- socketConnection(host = "127.0.0.1", port = comm_port, open = "r+b")
  assign("con", con, envir = cache)
  print("after socket")
  Sys.sleep(3)
  print("start msg")
  json_in <- rflow_receive() #rawToChar(readBin(con, raw(), 1e3))
  json_out <- '{"command" : "START_NODERED"}'
  #Sys.sleep(3)
  print("start node")
  rflow_send(json_out) #writeBin(charToRaw(json_out), con)
  print("after start node")
  start_time <- Sys.time()
  wait <- TRUE
  while (wait) {
    print("read node")
    Sys.sleep(3)
    json_in <- rflow_receive() #fromJSON(rawToChar(readBin(con, raw(), 1e3)))
    if (nchar(json_in) == 0) next
    json_in <- fromJSON(json_in)
    if (json_in$message == "LOADED_NODERED") break
    if (as.double(Sys.time() - start_time) > 10) 
      return(message("Unable to start NodeRed"))
    print(as.double(Sys.time() - start_time))
  }
  if (viewer) viewer(node_url) else getOption("browser")(node_url)
  setwd(cwd)
  #assign("con", con, envir = cache)
  invisible(NULL)
}

#' @title JSON Writer
#' @description Send a JSON Representation of User-facing Functions to the NodeRed App
#' @param pkg_nodes Character scalar holding JSON representation of nodes
#' @param con Connection object point to node application's tcp server
#' @return NULL invisibly
rflow_send <- function(json_out) {
  msg_out <- c(as.raw(0x00), charToRaw(json_out), as.raw(0x00))
  writeBin(msg_out, cache$con)
  invisible(NULL)
}

#' @title JSON Reader
#' @description Receive a JSON Representation of Generated Functions from the NodeRed App
#' @param con Connection object point to node application's tcp server
#' @return Character scalar holding a message in JSON format
rflow_receive <- function() {
  msg_in <- readBin(cache$con, raw(), 1e5)
  nul_indx <- which(msg_in == as.raw(0x00))
  json_in <- rawToChar(msg_in[-nul_indx])
  json_in
}

#' @title End RFlow
#' @description Shuts down node-red environment, communication server and
#'   cleans up connection
#' @inheritParams generate_code
#' @return NULL returned invisibly
#' @export
rflow_end <- function() {
  json_out <- '{"command" : "STOP_RFLOW"}'
  rflow_send(json_out) #writeBin(charToRaw(json_out), cache$con)
  #rflow_receive()
  close(cache$con)
  invisible(NULL)
}
