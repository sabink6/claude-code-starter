# Spec for auth-forms

branch: claude/feature/auth-forms
figma_component (if used): N/A

## Summary
Add authentication forms to the `/login` and `/signup` pages. Each form collects an email and password, lets the user toggle password visibility, and submits via a labeled button ("Login" or "Sign Up"). For now, submission only logs the form details to the console rather than calling a real authentication service. Users should be able to easily switch between the login and signup forms.

## Functional Requirements
- `/login` page renders a form with an email field, a password field, and a "Login" submit button.
- `/signup` page renders a form with an email field, a password field, and a "Sign Up" submit button.
- Both password fields include a "hide/show" toggle icon that switches the field between masked and plain text input.
- On submit, the form logs the entered email and password (and which form was submitted) to the console. No network request or real authentication occurs.
- Each form includes a way to switch to the other form (e.g. a link or button from login to signup, and vice versa).
- Basic client-side validation ensures the email and password fields are not empty before allowing submission.

## Figma Design Reference (only if referenced)
- Not applicable — no Figma reference provided.

## Possible Edge Cases
- User submits the form with empty email and/or password fields.
- User enters an email without a valid format (e.g. missing "@").
- User toggles password visibility multiple times in a row.
- User switches between login and signup forms after partially filling one out — should the other form retain or reset its fields?
- Very long input values in email or password fields.
- Submitting the form via keyboard (Enter key) rather than clicking the button.

## Acceptance Criteria
- Visiting `/login` shows an email field, password field with hide/show toggle, and a "Login" button.
- Visiting `/signup` shows an email field, password field with hide/show toggle, and a "Sign Up" button.
- Clicking the hide/show icon toggles the password field's visibility between masked and plain text.
- Submitting either form with valid input logs the form's data to the console and does not navigate away or hit a network endpoint.
- Submitting either form with an empty required field is prevented, with some indication of the missing field.
- A visible control on the login form navigates to the signup form, and vice versa.

## Open Questions
- Should switching between login/signup be a client-side toggle (no page navigation) or an actual route change between `/login` and `/signup`? A: Client
- Should any password strength or format rules apply on signup, or is presence-only validation sufficient for this pass? A: Light validation on email
- Should form field values persist if a user switches forms and switches back? A: Email only

## Testing Guidelines
Create a test file(s) in the ./test folder for the new feature, and create meaningful tests for the following cases, without going too heavy:
- Login form renders email field, password field, and "Login" button.
- Signup form renders email field, password field, and "Sign Up" button.
- Clicking the hide/show icon toggles the password input's visibility.
- Submitting a form with valid input triggers a console log with the expected data.
- Submitting a form with an empty field does not trigger the console log.
- Clicking the switch-forms control navigates/toggles to the other form.
