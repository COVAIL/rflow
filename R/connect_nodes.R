

#' holds connection object
cache <- new.env()

#' constructs requests in json format
make_request <- function(msg_out, flows = "") {
  request <- sprintf(
    '{"command" : "%s", "node_names" : [%s]}',
    msg_out,
    ifelse(
      nchar(flows)[1] == 0,
      "",
      paste0('"', flows, '"', collapse = ",")
    )
  )
  request
}

#' @title Start RFlow
#' @description Takes app and communication ports to start
#' @param viewer Logical scalar determining whether to open the node-red environment
#'   in the Rstudio viewer or a browser window
#' @param tcp_port Character scalar giving communication server port
#' @return Opens Nodered app in the viewer or browser, and returns NULL
#' @importFrom rstudioapi viewer
#' @importFrom sys exec_background
#' @export
rflow_start <- function(viewer = TRUE, tcp_port = 1338L) {
  stopifnot(is.logical(viewer), is.integer(tcp_port))
  
  cwd <- getwd()
  path <- system.file("node/nodered_custom", package = "nodegen")
  setwd(path)
  cmd <- "node"
  app <- "rflow.js" #file.path(path, "rflow.js")
  app_port <- 1337L
  args <- c(
    app, 
    "--comm_port" = tcp_port,
    "--node_port" = app_port#,
    #"--dir" = path
  )
  #if (comm_port != "1338") node_call = paste(node_call, comm_port)
  app_url <- paste("http://127.0.0.1", app_port, sep = ":")
  
  print("before cmd")
  pid <- exec_background(cmd, args)
  assign("pid", pid, envir = cache)
  #system2(cmd, args, wait = FALSE, stdout = "")
  print("after cmd")
  Sys.sleep(2) # maybe while loop
  print("socket")
  con <- socketConnection("127.0.0.1", tcp_port, open = "r+b")
  assign("con", con, envir = cache)
  print("after socket")
  Sys.sleep(3)
  print("start msg")
  #response <- rflow_receive() #rawToChar(readBin(con, raw(), 1e3))
  request <- make_request("START_NODERED")
  #Sys.sleep(3)
  print("start node")
  rflow_send(request) #writeBin(charToRaw(request), con)
  print("after start node")
  start_time <- Sys.time()
  wait <- TRUE
  while (wait) {
    print("read node")
    Sys.sleep(3)
    response <- rflow_receive() #fromJSON(rawToChar(readBin(con, raw(), 1e3)))
    if (nchar(response) == 0) next
    response <- fromJSON(response)
    if (response$message == "LOADED_NODERED") break
    if (as.double(Sys.time() - start_time) > 10)
      return(message("Unable to start NodeRed"))
    print(as.double(Sys.time() - start_time))
  }
  if (viewer) viewer(app_url) else getOption("browser")(app_url)
  setwd(cwd)
  invisible(NULL)
}

#' @title JSON Writer
#' @description Send a JSON Representation of User-facing Functions to
#'   the NodeRed App
#' @param request Character scalar holding JSON representation of the request
#' @return Send request to the app and NULL invisibly
rflow_send <- function(request) {
  header <- sprintf("%010d", nchar(request))
  msg_out <- c(as.raw(0x00), charToRaw(header), charToRaw(request), as.raw(0x00))
  writeBin(msg_out, cache$con)
  invisible(NULL)
}

#' @title JSON Reader
#' @description Receive a JSON Representation of Generated Functions from the
#'   NodeRed App
#' @return Character scalar holding a message in JSON format
rflow_receive <- function() {
  msg_header <- readBin(cache$con, raw(), 11)
  body_len <- as.integer(rawToChar(msg_header[-1]))
  msg_body <- readBin(cache$con, raw(), body_len + 1L) #unlist(replicate(1e4, readBin(cache$con, raw(), 1)))
  #nul_indx <- which(msg_in == as.raw(0x00))
  response <- rawToChar(msg_body[-(body_len + 1L)])
  response
}

#' @title End RFlow
#' @description Shuts down node-red environment, communication server and
#'   cleans up connection
#' @return Remove connection and return NULL invisibly
#' @importFrom tools pskill
#' @export
rflow_end <- function() {
  con_status <- tryCatch({
    request <- make_request("STOP_RFLOW")
    rflow_send(request)
    close(cache$con)
    },
    error = function(error) pskill(cache$pid)
  )
  invisible(con_status)
}
