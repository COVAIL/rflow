

#' @title User-facing Function Checker
#' @description For a given object in some package, determine whether it is a function,
#'   it has at least one argument and has documentation.
#' @param fun_name Character scalar naming an object in a package's namespace
#' @param pkg Character scalar naming a package
#' @param ns Environment corresponding to package's namespace
#' @return Logical scalar showing whether an object is a function with certain features
#'   or not
fun_check <- function(fun_name, pkg, ns) {
  doc <- eval(substitute(help(fun_name, pkg), list(pkg = pkg)))
  fun <- ns[[fun_name]]
  test <- is.function(fun) && !is.null(formals(fun)) && length(doc)
  if (test) return(TRUE) else FALSE
}

#' @title Get Names of User-facing Functions
#' @description Using user-facing tests, obtain function names from a package namespace
#' @inheritParams fun_check 
#' @return Character vector holding function names
#' @importFrom magrittr '%>%'
fun_name <- function(pkg) {
  ns <- getNamespace(pkg)
  fun_name <- getNamespaceExports(ns)
  tests <- fun_name %>% 
    lapply(fun_check, pkg, ns) %>% 
    unlist
  fun_name <- fun_name[which(tests)]
  fun_name
}

#' @title Get Arguments of User-facing Functions
#' @description For each user-facing function in a package, obtain argument names
#'   and default values
#' @inheritParams fun_check 
#' @return list of data_frames holding a column of argument names and a column of 
#'   default values
#' @importFrom dplyr data_frame
#' @importFrom stats setNames
#' @importFrom utils capture.output
fun_args <- function(fun_name, pkg) {
  getNamespace(pkg) %>%
    mget(fun_name, .) %>%
    lapply(function(fun) {
      formals(fun) %>% 
        lapply(deparse
          # function(x) {
          #   if (is.symbol(x) || is.call(x) || is.null(x))
          #     return(deparse(x))
          #   else 
          #     x
          # }
        ) %>% 
        data_frame(name = names(.), defaultValue = .) #[nchar(.) > 0]
    }
    ) %>% 
    setNames(NULL)
}

#' @title Get Documentation for a User-facing Function
#' @description For a user-facing function in some package, retrieve its manual
#'   and convert it into html format
#' @inheritParams fun_check
#' @return List of html formatted manuals of user-facing functions
#' @importFrom xml2 read_html xml_find_first xml_children 
fun_doc <- function(fun_name, pkg) {
  lapply(fun_name, function(fun) {
    help_loc <- eval(substitute(help(fun, pkg), list(pkg = pkg)))
    capture.output(
      help_loc %>% 
        utils:::.getHelpFile() %>% 
        tools::Rd2HTML() 
      ) %>%
      paste(collapse = "\n") %>% 
      read_html() %>% 
      xml_find_first("body") %>% 
      xml_children() %>% 
      paste(collapse = "\n") %>% 
      deparse
    }
  )
}


#' @title Build Function Signature
#' @description Takes function name and argument names and values to build a signature
#' @param func_name Character scalar giving function name
#' @param fun_args Data frame holding names and values of arguments
#' @return Character scalar representing a function signature
fun_signature <- function(func_name, func_args) {
  as.call(c(
    as.name(func_name),
    setNames(as.list(func_args$value), func_args$name)
  ))
}


