# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - heading "Release Compass" [level=1] [ref=e5]
    - paragraph [ref=e6]: Create a new music release project
  - generic [ref=e7]:
    - generic [ref=e8]:
      - generic [ref=e9]: New Release Project
      - generic [ref=e10]: Enter your release details. Milestones and timelines will be automatically generated.
    - generic [ref=e12]:
      - generic [ref=e13]:
        - text: Artist Name
        - textbox "Artist Name" [ref=e14]:
          - /placeholder: Enter artist name
      - generic [ref=e15]:
        - text: Release Title
        - textbox "Release Title" [ref=e16]:
          - /placeholder: Enter release title
      - generic [ref=e17]:
        - text: Release Date
        - textbox "Release Date" [ref=e18]
        - paragraph [ref=e19]: Must be a future date
      - generic [ref=e20]:
        - text: Release Type
        - combobox [ref=e21]:
          - generic: Single
          - img [ref=e22]
        - combobox [ref=e24]
      - generic [ref=e25]:
        - text: Total Budget ($)
        - spinbutton "Total Budget ($)" [ref=e26]
        - paragraph [ref=e27]: Enter your total project budget in USD
      - generic [ref=e28]:
        - button "Create Project" [ref=e29]
        - button "Cancel" [ref=e30]
```