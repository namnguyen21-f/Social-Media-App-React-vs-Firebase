const isEmpty = (string) => {
  if (string.trim() === "") return true;
  else return false;
};

const isEmail = (string) => {
  const regExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (string.match(regExp)) return true;
  else return false;
};

const IsPassword = (pass, confirmpass) => {
  if (pass === confirmpass) return true;
  else return false;
};

exports.validateSignupData = (data) => {
  var errors = {};

  if (isEmpty(data.email)) errors.email = "Email must not be empty";
  else {
    if (!isEmail(data.email)) errors.email = "Email is not invalid";
  }

  if (isEmpty(data.password)) errors.password = "Password must not be empty";
  else {
    if (!IsPassword(data.password, data.confirmPassword))
      errors.password = "Password and ConfirmPassword are not equal";
  }

  if (isEmpty(data.handle)) errors.handle = "Handle must not be empty";
  return {
    errors,
    valid: Object.keys(errors).length <= 0 ? true : false,
  };
};

exports.validateLoginData = (data) => {
  var errors = {};
  if (isEmpty(data.email)) errors.email = "Email must not be empty";
  if (isEmpty(data.password)) errors.password = "Password must not be empty";
  return {
    errors,
    valid: Object.keys(errors).length <= 0 ? true : false,
  };
};

exports.reduceUserDetails = (data) => {
  let reduceUser = {};
  if (!isEmpty(data.bio.trim())) reduceUser.bio = data.bio;
  if (!isEmpty(data.website.trim())) {
    if (data.website.trim().substring(0, 4) === "http") {
      reduceUser.website = data.website;
    } else {
      reduceUser.website = "https://" + data.website.trim();
    }
  }
  if (!isEmpty(data.location.trim())) {
    reduceUser.location = data.location.trim();
  }
  return reduceUser;
};
