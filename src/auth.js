export function saveUser(user) {

  localStorage.setItem(
    "cashprime_user",
    JSON.stringify(user)
  );

}


export function getUser() {

  const user = localStorage.getItem(
    "cashprime_user"
  );

  return user ? JSON.parse(user) : null;

}


export function logoutUser() {

  localStorage.removeItem(
    "cashprime_user"
  );

}