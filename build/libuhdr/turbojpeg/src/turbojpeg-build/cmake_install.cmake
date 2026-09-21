# Install script for directory: /Users/dalton/Sites/sandbox/uhdr/vendor/libultrahdr/third_party/turbojpeg

# Set the install prefix
if(NOT DEFINED CMAKE_INSTALL_PREFIX)
  set(CMAKE_INSTALL_PREFIX "/opt/libjpeg-turbo")
endif()
string(REGEX REPLACE "/$" "" CMAKE_INSTALL_PREFIX "${CMAKE_INSTALL_PREFIX}")

# Set the install configuration name.
if(NOT DEFINED CMAKE_INSTALL_CONFIG_NAME)
  if(BUILD_TYPE)
    string(REGEX REPLACE "^[^A-Za-z0-9_]+" ""
           CMAKE_INSTALL_CONFIG_NAME "${BUILD_TYPE}")
  else()
    set(CMAKE_INSTALL_CONFIG_NAME "Release")
  endif()
  message(STATUS "Install configuration: \"${CMAKE_INSTALL_CONFIG_NAME}\"")
endif()

# Set the component getting installed.
if(NOT CMAKE_INSTALL_COMPONENT)
  if(COMPONENT)
    message(STATUS "Install component: \"${COMPONENT}\"")
    set(CMAKE_INSTALL_COMPONENT "${COMPONENT}")
  else()
    set(CMAKE_INSTALL_COMPONENT)
  endif()
endif()

# Is this installation the result of a crosscompile?
if(NOT DEFINED CMAKE_CROSSCOMPILING)
  set(CMAKE_CROSSCOMPILING "TRUE")
endif()

# Set path to fallback-tool for dependency-resolution.
if(NOT DEFINED CMAKE_OBJDUMP)
  set(CMAKE_OBJDUMP "/usr/bin/objdump")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib32" TYPE STATIC_LIBRARY FILES "/Users/dalton/Sites/sandbox/uhdr/web/build/libuhdr/turbojpeg/src/turbojpeg-build/libturbojpeg.a")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/bin" TYPE PROGRAM RENAME "tjbench.js" FILES "/Users/dalton/Sites/sandbox/uhdr/web/build/libuhdr/turbojpeg/src/turbojpeg-build/tjbench-static.js")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/include" TYPE FILE FILES "/Users/dalton/Sites/sandbox/uhdr/vendor/libultrahdr/third_party/turbojpeg/turbojpeg.h")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib32" TYPE STATIC_LIBRARY FILES "/Users/dalton/Sites/sandbox/uhdr/web/build/libuhdr/turbojpeg/src/turbojpeg-build/libjpeg.a")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/bin" TYPE PROGRAM RENAME "cjpeg.js" FILES "/Users/dalton/Sites/sandbox/uhdr/web/build/libuhdr/turbojpeg/src/turbojpeg-build/cjpeg-static.js")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/bin" TYPE PROGRAM RENAME "djpeg.js" FILES "/Users/dalton/Sites/sandbox/uhdr/web/build/libuhdr/turbojpeg/src/turbojpeg-build/djpeg-static.js")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/bin" TYPE PROGRAM RENAME "jpegtran.js" FILES "/Users/dalton/Sites/sandbox/uhdr/web/build/libuhdr/turbojpeg/src/turbojpeg-build/jpegtran-static.js")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/bin" TYPE EXECUTABLE FILES "/Users/dalton/Sites/sandbox/uhdr/web/build/libuhdr/turbojpeg/src/turbojpeg-build/rdjpgcom.js")
  if(EXISTS "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/bin/rdjpgcom.js" AND
     NOT IS_SYMLINK "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/bin/rdjpgcom.js")
    if(CMAKE_INSTALL_DO_STRIP)
      execute_process(COMMAND "/usr/bin/strip" "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/bin/rdjpgcom.js")
    endif()
  endif()
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/bin" TYPE EXECUTABLE FILES "/Users/dalton/Sites/sandbox/uhdr/web/build/libuhdr/turbojpeg/src/turbojpeg-build/wrjpgcom.js")
  if(EXISTS "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/bin/wrjpgcom.js" AND
     NOT IS_SYMLINK "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/bin/wrjpgcom.js")
    if(CMAKE_INSTALL_DO_STRIP)
      execute_process(COMMAND "/usr/bin/strip" "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/bin/wrjpgcom.js")
    endif()
  endif()
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/doc" TYPE FILE FILES
    "/Users/dalton/Sites/sandbox/uhdr/vendor/libultrahdr/third_party/turbojpeg/README.ijg"
    "/Users/dalton/Sites/sandbox/uhdr/vendor/libultrahdr/third_party/turbojpeg/README.md"
    "/Users/dalton/Sites/sandbox/uhdr/vendor/libultrahdr/third_party/turbojpeg/example.c"
    "/Users/dalton/Sites/sandbox/uhdr/vendor/libultrahdr/third_party/turbojpeg/tjexample.c"
    "/Users/dalton/Sites/sandbox/uhdr/vendor/libultrahdr/third_party/turbojpeg/libjpeg.txt"
    "/Users/dalton/Sites/sandbox/uhdr/vendor/libultrahdr/third_party/turbojpeg/structure.txt"
    "/Users/dalton/Sites/sandbox/uhdr/vendor/libultrahdr/third_party/turbojpeg/usage.txt"
    "/Users/dalton/Sites/sandbox/uhdr/vendor/libultrahdr/third_party/turbojpeg/wizard.txt"
    "/Users/dalton/Sites/sandbox/uhdr/vendor/libultrahdr/third_party/turbojpeg/LICENSE.md"
    )
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/man/man1" TYPE FILE FILES
    "/Users/dalton/Sites/sandbox/uhdr/vendor/libultrahdr/third_party/turbojpeg/cjpeg.1"
    "/Users/dalton/Sites/sandbox/uhdr/vendor/libultrahdr/third_party/turbojpeg/djpeg.1"
    "/Users/dalton/Sites/sandbox/uhdr/vendor/libultrahdr/third_party/turbojpeg/jpegtran.1"
    "/Users/dalton/Sites/sandbox/uhdr/vendor/libultrahdr/third_party/turbojpeg/rdjpgcom.1"
    "/Users/dalton/Sites/sandbox/uhdr/vendor/libultrahdr/third_party/turbojpeg/wrjpgcom.1"
    )
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib32/pkgconfig" TYPE FILE FILES "/Users/dalton/Sites/sandbox/uhdr/web/build/libuhdr/turbojpeg/src/turbojpeg-build/pkgscripts/libjpeg.pc")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib32/pkgconfig" TYPE FILE FILES "/Users/dalton/Sites/sandbox/uhdr/web/build/libuhdr/turbojpeg/src/turbojpeg-build/pkgscripts/libturbojpeg.pc")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib32/cmake/libjpeg-turbo" TYPE FILE FILES
    "/Users/dalton/Sites/sandbox/uhdr/web/build/libuhdr/turbojpeg/src/turbojpeg-build/pkgscripts/libjpeg-turboConfig.cmake"
    "/Users/dalton/Sites/sandbox/uhdr/web/build/libuhdr/turbojpeg/src/turbojpeg-build/pkgscripts/libjpeg-turboConfigVersion.cmake"
    )
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  if(EXISTS "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/lib32/cmake/libjpeg-turbo/libjpeg-turboTargets.cmake")
    file(DIFFERENT _cmake_export_file_changed FILES
         "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/lib32/cmake/libjpeg-turbo/libjpeg-turboTargets.cmake"
         "/Users/dalton/Sites/sandbox/uhdr/web/build/libuhdr/turbojpeg/src/turbojpeg-build/CMakeFiles/Export/a49e8630ad8d1c31c1c0cd3196981171/libjpeg-turboTargets.cmake")
    if(_cmake_export_file_changed)
      file(GLOB _cmake_old_config_files "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/lib32/cmake/libjpeg-turbo/libjpeg-turboTargets-*.cmake")
      if(_cmake_old_config_files)
        string(REPLACE ";" ", " _cmake_old_config_files_text "${_cmake_old_config_files}")
        message(STATUS "Old export file \"$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/lib32/cmake/libjpeg-turbo/libjpeg-turboTargets.cmake\" will be replaced.  Removing files [${_cmake_old_config_files_text}].")
        unset(_cmake_old_config_files_text)
        file(REMOVE ${_cmake_old_config_files})
      endif()
      unset(_cmake_old_config_files)
    endif()
    unset(_cmake_export_file_changed)
  endif()
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib32/cmake/libjpeg-turbo" TYPE FILE FILES "/Users/dalton/Sites/sandbox/uhdr/web/build/libuhdr/turbojpeg/src/turbojpeg-build/CMakeFiles/Export/a49e8630ad8d1c31c1c0cd3196981171/libjpeg-turboTargets.cmake")
  if(CMAKE_INSTALL_CONFIG_NAME MATCHES "^([Rr][Ee][Ll][Ee][Aa][Ss][Ee])$")
    file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib32/cmake/libjpeg-turbo" TYPE FILE FILES "/Users/dalton/Sites/sandbox/uhdr/web/build/libuhdr/turbojpeg/src/turbojpeg-build/CMakeFiles/Export/a49e8630ad8d1c31c1c0cd3196981171/libjpeg-turboTargets-release.cmake")
  endif()
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/include" TYPE FILE FILES
    "/Users/dalton/Sites/sandbox/uhdr/web/build/libuhdr/turbojpeg/src/turbojpeg-build/jconfig.h"
    "/Users/dalton/Sites/sandbox/uhdr/vendor/libultrahdr/third_party/turbojpeg/jerror.h"
    "/Users/dalton/Sites/sandbox/uhdr/vendor/libultrahdr/third_party/turbojpeg/jmorecfg.h"
    "/Users/dalton/Sites/sandbox/uhdr/vendor/libultrahdr/third_party/turbojpeg/jpeglib.h"
    )
endif()

if(NOT CMAKE_INSTALL_LOCAL_ONLY)
  # Include the install script for each subdirectory.
  include("/Users/dalton/Sites/sandbox/uhdr/web/build/libuhdr/turbojpeg/src/turbojpeg-build/md5/cmake_install.cmake")

endif()

string(REPLACE ";" "\n" CMAKE_INSTALL_MANIFEST_CONTENT
       "${CMAKE_INSTALL_MANIFEST_FILES}")
if(CMAKE_INSTALL_LOCAL_ONLY)
  file(WRITE "/Users/dalton/Sites/sandbox/uhdr/web/build/libuhdr/turbojpeg/src/turbojpeg-build/install_local_manifest.txt"
     "${CMAKE_INSTALL_MANIFEST_CONTENT}")
endif()
if(CMAKE_INSTALL_COMPONENT)
  if(CMAKE_INSTALL_COMPONENT MATCHES "^[a-zA-Z0-9_.+-]+$")
    set(CMAKE_INSTALL_MANIFEST "install_manifest_${CMAKE_INSTALL_COMPONENT}.txt")
  else()
    string(MD5 CMAKE_INST_COMP_HASH "${CMAKE_INSTALL_COMPONENT}")
    set(CMAKE_INSTALL_MANIFEST "install_manifest_${CMAKE_INST_COMP_HASH}.txt")
    unset(CMAKE_INST_COMP_HASH)
  endif()
else()
  set(CMAKE_INSTALL_MANIFEST "install_manifest.txt")
endif()

if(NOT CMAKE_INSTALL_LOCAL_ONLY)
  file(WRITE "/Users/dalton/Sites/sandbox/uhdr/web/build/libuhdr/turbojpeg/src/turbojpeg-build/${CMAKE_INSTALL_MANIFEST}"
     "${CMAKE_INSTALL_MANIFEST_CONTENT}")
endif()
