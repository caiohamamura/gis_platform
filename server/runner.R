pacman::p_load(plumber)

# 'plumber.R' is the location of the file shown above
pr("server/server.R") %>%
  pr_run(port=9000)