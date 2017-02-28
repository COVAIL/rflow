#' @title Generate a JSON Representation of User-facing Functions
#' @description Generates a JSON with function names, arguments, default values, and
#'   manuals for all user-facing functions in a package
#' @inheritParams fun_check
#' @return Translate package functions to nodes and return NULL invisibly
#' @importFrom jsonlite toJSON
#' @importFrom utils packageVersion
#' @export
rflow_pkgnodes <- function(pkg) {
  stopifnot(is.character(pkg), pkg %in% installed.packages()[, "Package"])
  
  names <- fun_name(pkg)
  args <- fun_args(names, pkg)
  docs <- fun_doc(names, pkg)
  module_name <- paste("rflow", pkg, "gen", "nodes", sep = "-")
  pkg_version <- unlist(packageVersion(pkg))
  
  request <- list(
    command = "GENERATE_NODES",
    module = list(
      name = module_name,
      version = ifelse(
        length(pkg_version) == 2,
        paste(c(pkg_version, "0"), collapse = "."),
        paste(pkg_version[1:3], collapse = ".")
      ),
      nodes = data_frame(
        name = names,
        args = args,
        doc = docs,
        category = pkg
      )
    )
    ) %>%
    toJSON(auto_unbox = TRUE)
    
  rflow_send(request)
  invisible(NULL)
}

#' Converts table of function information into lines of code
as_code <- function(outputVar, operator, funs) {
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
  code
}

#' @title Generate R code from nodes
#' @description Takes a connection to the node app and inserts R code 
#'   corresponding to nodes
#' @param outputVar Character scalar with name of the variable to capture the output
#' @param operator Character scalar giving an operator to compose the function calls
#' @return Inserts generated code as text and returns NULL invisibly
#' @importFrom rstudioapi insertText
#' @importFrom jsonlite fromJSON
#' @export
rflow_code <- function(outputVar = "", operator = c("<-", "%>%", "+")[1], flows = "") {
  stopifnot(
    all(is.character(outputVar)),
    operator %in% c("<-", "%>%", "+"),
    all(is.character(flows))
  )
  
  request <- make_request("RUN_FLOWS", flows)
  rflow_send(request)
  Sys.sleep(2)
  response <- rflow_receive()
  print(response)
  Sys.sleep(2)
  funs <- fromJSON(response)$message$funcs

  code <- paste0(
    mapply(as_code, outputVar, operator, funs, SIMPLIFY = TRUE),
    collapse = "\n"
  )
  insertText(Inf, code)
  invisible(NULL)
}

#' @title Evaluate R code from nodes
#' @description Takes a connection to the node app and evaluates R code 
#'   corresponding to nodes
#' @param tcp_msg Character scalar holding a message from the tcp server in JSON format
#' @return Final return value of the generated code
#' @importFrom rstudioapi insertText
#' @importFrom jsonlite fromJSON
#' @export
rflow_eval <- function(operator = c("<-", "%>%", "+")[1], flows = "") {
  stopifnot(operator %in% c("<-", "%>%", "+"), all(is.character(flows)))
  
  request <- make_request("RUN_FLOWS", flows)
  rflow_send(request)
  Sys.sleep(.5)
  response <- rflow_receive()
  print(response)
  Sys.sleep(2)
  funs <- fromJSON(response)$message$funcs
  signatures <- mapply(fun_signature, funs$name, funs$args, USE.NAMES = FALSE)
  
  code <- switch(
    operator,
    "<-" = paste0(funs$outputVar, " <- ", signatures, collapse = "\n"),
    "%>%" = paste0(paste(signatures, collapse = " %>%\n  ")),
    "+" = paste0(paste(signatures, collapse = " +\n  "))
    ) %>% 
    gsub('\\\\"', "'", .) %>% 
    gsub('\"{2,2}', "''", .) %>% 
    gsub('\"', "", .)
  result <- eval(parse(text = code))
  result
}






