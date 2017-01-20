

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
  cmd <- "node"
  path <- system.file("node/nodered_custom", package = "nodegen")
  app <- file.path(path, "rflow.js")
  args <- c(app, comm_port)
  #if (comm_port != "1338") node_call = paste(node_call, comm_port)
  node_url <- "http://127.0.0.1:1337"
  
  system2(cmd, args, wait = FALSE, stdout = FALSE)
  if (viewer) viewer(node_url) else getOption("browser")(node_url)
  Sys.sleep(1)
  con <- socketConnection(host = "127.0.0.1", port = comm_port, open = "r+b")
  invisible(con)
}

#' @title Generate R code from nodes
#' @description Takes a connection to the node app and inserts R code corresponding to nodes
#' @param con Connection object for the communication server 
#' @return Character scalar holding the generated code
#' @importFrom rstudioapi insertText
#' @export
generate_code <- function(con) {
  code <- readLines(con)
  code <- paste(code, collapse = "\n")
  insertText(Inf, code)
}

#' @title End RFlow
#' @description Shuts down node-red environment, communication server and
#'   cleans up connection
#' @inheritParams generate_code
#' @return NULL returned invisibly
#' @export
rflow_end <- function(con) {
  msg <- "end app"
  writeChar(msg, con, nchar(msg))
  close(con)
  invisible(NULL)
}
