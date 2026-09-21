file(REMOVE_RECURSE
  "turbojpeg/src/turbojpeg-build"
  "libuhdr.a"
  "libuhdr.pdb"
)

# Per-language clean rules from dependency scanning.
foreach(lang CXX)
  include(CMakeFiles/uhdr.dir/cmake_clean_${lang}.cmake OPTIONAL)
endforeach()
