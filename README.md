# VSCode log extension

Atomatic log analysis by rule file.

This plugin will:

- Match log content using fixed rules
- Modify the font and color of the matched content
- Collect error content and display it on VSCode panel
- Redirect the error content corresponding to the source file version and jump to the corresponding line number of the source file

## Rule file:

### color.json

Describe the matched content font and color

```json
{
  "type_1": {
    "foreground": "#ff0000", # Required: content color
    "italic": true, # Optional: italic
    "bold": true, # Optional: bold
    "underline": true # Optional: underline
  }
  ...
}
```

### regex.json

Match log content by regex

```json
{
  "highlight": {
    "content_type_which_you_describe": {
        "regex": "", // Required: typescript / javascript Regex string
        "theme": "type_1", // Required: corresponding to item in color.json
        "char": "", // Optional: Cut matched content, corresponding to regex
        "offset": "", // Optional: Match the content len + offset
        "tilEnd": true // Optional: Match the content from start to end in this line
    }
    ...
  },
  "panel": [
    "content_type_which_you_describe" // save the matched regex content to VSCode panel
    ...
  ],
  "jump": [
    "content_type_which_you_describe" // This matched regex content contains related source file and line number, will automatic jump to source file
    ...
  ]
}
```

## Example:

 [Example](./example)

## Requirements

- VSCode >= 1.76.0
