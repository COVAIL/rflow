#' @title Generate a JSON Representation of User-facing Functions
#' @description Generates a JSON with function names, arguments, default values, and
#'   manuals for all user-facing functions in a package
#' @inheritParams fun_check
#' @importFrom jsonlite toJSON
#' @export
generate_nodes <- function(pkg) {
  names <- fun_name(pkg)
  args <- fun_args(names, pkg)
  docs <- fun_doc(names, pkg)
  
  #set_name <- paste("node-set", pkg, sep = "-")
  module_name <- paste("rflow", pkg, "gen", "nodes", sep = "-")
  pkg_version <- unlist(packageVersion("mlr"))
  json_out <- list(
    command = "GENERATE_NODES",
    module = list(
      name = module_name,
      version = ifelse(
        length(pkg_version) == 2,
        paste(c(pkg_version, "0"), collapse = "."),
        paste(pkg_version, collapse = ".")
      ),
      nodes = data_frame(
        name = names,
        args = args,
        doc = docs,
        category = pkg
      )
    )
    ) %>%
    toJSON(auto_unbox = TRUE) #%>% 
    #structure(set_size = length(fun_names))
  rflow_send(json_out)
  invisible(NULL)
}


#' @title Generate R code from nodes
#' @description Takes a connection to the node app and inserts R code corresponding to nodes
#' @param tcp_msg Character scalar holding a message from the tcp server in JSON format
#' @return Character scalar holding the generated code
#' @importFrom rstudioapi insertText
#' @importFrom jsonlite fromJSON
#' @export
generate_code <- function(outputVar = "", operator = c("<-", "%>%", "+")[1],
                          eval = FALSE) {
  json_out <- '{"command" : "RUN_FLOWS", "node_names" : []}'
  rflow_send(json_out)
  Sys.sleep(.5)
  json_in <- rflow_receive()
  Sys.sleep(.5)
  funs <- fromJSON(json_in)$message$funcs
  signatures <- mapply(fun_signature, funs$name, funs$args, USE.NAMES = FALSE)
  if (nchar(outputVar) > 0) outputVar <- paste0(outputVar, " <- ")
  
  code <- switch(
    operator,
    "<-" = paste0(funs$outputVar, " <- ", signatures, collapse = "\n"),
    "%>%" = paste0(outputVar, paste(signatures, collapse = " %>%\n  ")),
    "+" = paste0(outputVar, paste(signatures, collapse = " +\n  "))
    ) %>% 
    gsub('\\\\"', "'", .) %>% 
    gsub('\"{2,2}', "''", .) %>% 
    gsub('\"', "", .)
  ifelse(eval, eval(parse(text = code)), insertText(Inf, code))
}





