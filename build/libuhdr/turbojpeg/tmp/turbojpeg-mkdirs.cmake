# Distributed under the OSI-approved BSD 3-Clause License.  See accompanying
# file LICENSE.rst or https://cmake.org/licensing for details.

cmake_minimum_required(VERSION ${CMAKE_VERSION}) # this file comes with cmake

# If CMAKE_DISABLE_SOURCE_CHANGES is set to true and the source directory is an
# existing directory in our source tree, calling file(MAKE_DIRECTORY) on it
# would cause a fatal error, even though it would be a no-op.
if(NOT EXISTS "/Users/dalton/Sites/sandbox/uhdr/vendor/libultrahdr/third_party/turbojpeg")
  file(MAKE_DIRECTORY "/Users/dalton/Sites/sandbox/uhdr/vendor/libultrahdr/third_party/turbojpeg")
endif()
file(MAKE_DIRECTORY
  "/Users/dalton/Sites/sandbox/uhdr/web/build/libuhdr/turbojpeg/src/turbojpeg-build"
  "/Users/dalton/Sites/sandbox/uhdr/web/build/libuhdr/turbojpeg"
  "/Users/dalton/Sites/sandbox/uhdr/web/build/libuhdr/turbojpeg/tmp"
  "/Users/dalton/Sites/sandbox/uhdr/web/build/libuhdr/turbojpeg/src/turbojpeg-stamp"
  "/Users/dalton/Sites/sandbox/uhdr/web/build/libuhdr/turbojpeg/src"
  "/Users/dalton/Sites/sandbox/uhdr/web/build/libuhdr/turbojpeg/src/turbojpeg-stamp"
)

set(configSubDirs )
foreach(subDir IN LISTS configSubDirs)
    file(MAKE_DIRECTORY "/Users/dalton/Sites/sandbox/uhdr/web/build/libuhdr/turbojpeg/src/turbojpeg-stamp/${subDir}")
endforeach()
if(cfgdir)
  file(MAKE_DIRECTORY "/Users/dalton/Sites/sandbox/uhdr/web/build/libuhdr/turbojpeg/src/turbojpeg-stamp${cfgdir}") # cfgdir has leading slash
endif()
