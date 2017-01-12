

#' @title User-facing Function Checker
#' @description For a given object in some package, determine whether it is a function,
#'   it has at least one argument and has documentation.
#' @param fun_name Character scalar naming an object in a package's namespace
#' @param pkg Character scalar naming a package
#' @param ns Environment corresponding to package's namespace
#' @return Logical scalar showing whether an object is a function with certain features
#'   or not
check_fun <- function(fun_name, pkg, ns) {
  doc <- eval(substitute(help(fun_name, pkg), list(pkg = pkg)))
  fun <- ns[[fun_name]]
  test <- is.function(fun) && !is.null(formals(fun)) && length(doc)
  if (test) return(TRUE) else FALSE
}

#' @title Get Names of User-facing Functions
#' @description Using user-facing tests, obtain function names from a package namespace
#' @inheritParams check_fun 
#' @return Character vector holding function names
#' @importFrom magrittr '%>%'
get_funs <- function(pkg) {
  ns <- asNamespace(pkg)
  fun_name <- ls(ns)
  tests <- fun_name %>% 
    lapply(check_fun, pkg, ns) %>% 
    unlist
  fun_name <- fun_name[which(tests)]
  fun_name
}

#' @title Get Arguments of User-facing Functions
#' @description For each user-facing function in a package, obtain argument names
#'   and default values
#' @inheritParams check_fun 
#' @return list of data_frames holding a column of argument names and a column of 
#'   default values
#' @importFrom dplyr data_frame
#' @importFrom stats setNames
#' @importFrom utils capture.output
get_args <- function(fun_name, pkg) {
  asNamespace(pkg) %>%
    mget(fun_name, .) %>%
    lapply(function(fun) {
      formals(fun) %>% 
        as.list(all.names = TRUE) %>% 
        lapply(
          function(x) {
            if (is.symbol(x) || is.call(x) || is.null(x))
              return(tolower(deparse(x)))
            else 
              x
          }
        ) %>% 
        data_frame(name = names(.), defaultValue = .)
    }
    ) %>% 
    setNames(NULL)
}

#' @title Get Documentation for a User-facing Function
#' @description For a user-facing function in some package, retrieve its manual
#'   and convert it into html format
#' @inheritParams check_fun
#' @return List of html formatted manuals of user-facing functions 
get_docs <- function(fun_name, pkg) {
  lapply(fun_name, function(fun) {
    help_loc <- eval(substitute(help(fun, pkg), list(pkg = pkg)))
    capture.output(
      help_loc %>% 
        utils:::.getHelpFile() %>% 
        tools::Rd2HTML()
    ) %>% 
      paste(collapse = "\n")
    }
  )
}



