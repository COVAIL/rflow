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
  category <- paste(pkg, "gen", sep = "-")
  
  nodes <- data_frame(
    name = fun_names,
    category = category,
    args = fun_args,
    doc = fun_docs
  ) %>%
    toJSON(auto_unbox = TRUE)
  nodes
}

#' @title Save a JSON Representation of User-facing Functions to Disk
#' @description Writes node specification to disk
#' @param pkg_nodes Character scalar holding JSON representation of nodes
#' @param file_name Character scalar in name.json format
#' @param path Character scalar giving write location
#' @return JSON file on disc and return NULL invisibly
#' @export
write_nodes <- function(pkg_nodes, file_name, path) {
  file_path <- paste(path, file_name, sep = "/")
  con <- file(file_path, "wb", raw = TRUE)
  writeBin(charToRaw(pkg_nodes), con)
  close(con)
  invisible(NULL)
}
