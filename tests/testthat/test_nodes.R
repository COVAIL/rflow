context("Testing node collection and generation")

pkg <- "tools"
fun_name <- c("psnice", "pskill")

test_that(
  "We can distinguish user-facing function from other objects",
  {
    expect_true(check_fun(fun_name[1], pkg, asNamespace(pkg)))
    expect_false(check_fun("SIGINT", pkg, asNamespace(pkg)))
  }
)

test_that(
  "We can obtain names of user-facing functions",
  {
    expect_gte(length(get_funs(pkg)), 50)
  }
)

test_that(
  "We can obtain arguments and their values for a set of functions",
  {
    res <- get_args(fun_name, pkg)
    expect_type(res, "list")
    expect_equal(length(res), 2)
    expect_true(inherits(res[[1]], "data.frame"))
    expect_gte(nrow(res[[1]]), 1)
    expect_equal(ncol(res[[1]]), 2)
  }
)

test_that(
  "We can obtain manuals for each functions",
  {
    res <- get_docs(fun_name, pkg)
    expect_type(res, "list")
    expect_true(all(grepl("HTML", res)))
  }
)

test_that(
  "We can generate JSON holding nodes specification",
  {
    res <- generate_nodes(pkg)
    expect_true(jsonlite::validate(res))
  }
)
