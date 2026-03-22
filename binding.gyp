{
  "targets": [
    {
      "target_name": "j2534_native",
      "sources": [ "native/j2534_bindings.cpp" ],
      "conditions": [
        ['OS=="win"', {
          "libraries": [
            "-ladvapi32.lib"
          ]
        }]
      ]
    }
  ]
}
