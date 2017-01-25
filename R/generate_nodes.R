#' @title Generate a JSON Representation of User-facing Functions
#' @description Generates a JSON with function names, arguments, default values, and
#'   manuals for all user-facing functions in a package
#' @inheritParams check_fun
#' @importFrom jsonlite toJSON
#' @export
generate_nodes <- function(pkg) {
  fun_names <- get_funs(pkg)
  fun_args <- get_args(fun_names, pkg)
  fun_docs <- get_docs(fun_names, pkg)
  
  #set_name <- paste("node-set", pkg, sep = "-")
  module_name <- paste("rflow", pkg, "gen", "nodes", sep = "-")
  pkg_version <- unlist(packageVersion("mlr"))
  tcp_msg <- list(
    command = "GENERATE_NODES",
    module = list(
      name = module_name,
      version = ifelse(
        length(pkg_version) == 2,
        paste(c(pkg_version, "0"), collapse = "."),
        paste(pkg_version, collapse = ".")
      ),
      nodes = data_frame(
        name = fun_names,
        args = fun_args,
        #doc = fun_docs,
        category = pkg
      )
    )
    ) %>%
    toJSON(auto_unbox = TRUE) #%>% 
    #structure(set_size = length(fun_names))
  tcp_msg
}


#' @title Generate R code from nodes
#' @description Takes a connection to the node app and inserts R code corresponding to nodes
#' @param tcp_msg Character scalar holding a message from the tcp server in JSON format
#' @return Character scalar holding the generated code
#' @importFrom rstudioapi insertText
#' @export
generate_code <- function(funcs) {
  #funcs <- fromJSON(tcp_msg)$funcs
  signatures <- mapply(
    get_signature,
    funcs$name,
    funcs$args,
    USE.NAMES = FALSE
  )
  calls <- sprintf(
    "%s <- %s\n",
    funcs$outputVar,
    signatures
  )
  code <- paste(calls, collapse = "")
  
  insertText(Inf, code)
}

generate_code(json$funcs)
