# Page snapshot

```yaml
- generic [ref=e5]:
  - generic [ref=e6]:
    - generic [ref=e8]: RI
    - generic [ref=e9]:
      - heading "RecruitIQ" [level=2] [ref=e10]
      - paragraph [ref=e11]: Applicant Tracking System
  - generic [ref=e12]:
    - heading "Secure sign-in" [level=2] [ref=e13]
    - paragraph [ref=e14]: Your data is protected
  - generic [ref=e15]:
    - generic [ref=e16]:
      - generic [ref=e17]: Email *
      - textbox "Email *" [ref=e18]:
        - /placeholder: you@example.com
    - generic [ref=e19]:
      - generic [ref=e20]: Password *
      - generic [ref=e21]:
        - textbox "Password *" [ref=e22]:
          - /placeholder: Enter your password
        - button "Show password" [ref=e23] [cursor=pointer]:
          - img [ref=e24]
    - button "Sign in" [ref=e27] [cursor=pointer]
  - generic [ref=e30]: or
  - generic [ref=e32]:
    - button "Sign in with Google" [ref=e33] [cursor=pointer]:
      - img [ref=e34]
      - text: Sign in with Google
    - button "Sign in with Microsoft" [ref=e39] [cursor=pointer]:
      - img [ref=e40]
      - text: Sign in with Microsoft
  - generic [ref=e46]:
    - button "Forgot password?" [ref=e47] [cursor=pointer]
    - generic [ref=e48]: English
  - generic [ref=e49]:
    - paragraph [ref=e50]: Demo Mode
    - paragraph [ref=e51]: Enter any email and password to sign in, or use the Google/Microsoft buttons for quick access.
```