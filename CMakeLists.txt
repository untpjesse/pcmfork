cmake_minimum_required(VERSION 3.14)
project(j2534_native)

# This CMakeLists.txt is provided for compatibility with generic C++ CI pipelines (like GitHub Actions).
# Since this is a Node.js Native Addon, the standard way to build it is using `node-gyp` (via binding.gyp).

add_library(${PROJECT_NAME} SHARED native/j2534_bindings.cpp)

# Node.js addons must have a .node extension
set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")

# If running via cmake-js, it automatically provides CMAKE_JS_INC and CMAKE_JS_LIB
if(DEFINED CMAKE_JS_VERSION)
    target_include_directories(${PROJECT_NAME} PRIVATE ${CMAKE_JS_INC})
    target_link_libraries(${PROJECT_NAME} ${CMAKE_JS_LIB})
else()
    # Fallback for raw CMake (e.g., GitHub Actions default C/C++ workflow):
    # Download Node headers so compilation doesn't fail on <node_api.h>
    message(STATUS "Raw CMake detected. Fetching Node.js headers for N-API...")
    include(FetchContent)
    FetchContent_Declare(
        node_headers
        URL https://nodejs.org/dist/v20.11.1/node-v20.11.1-headers.tar.gz
    )
    FetchContent_MakeAvailable(node_headers)
    target_include_directories(${PROJECT_NAME} PRIVATE ${node_headers_SOURCE_DIR}/include/node)
endif()

# Link Windows-specific libraries
if(WIN32)
    target_link_libraries(${PROJECT_NAME} advapi32)
endif()
