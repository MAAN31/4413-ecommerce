
import crypto from 'crypto';

const authTypes = ['github', 'twitter', 'facebook', 'google'];

import mongoose from 'mongoose';
const Schema = mongoose.Schema;

export const UserSchema = new Schema({
  name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    lowercase: true,
    match: [/[A-Za-z0-9]+@([A-Za-z])+(\.[A-Za-z]+)+/, "This email address is not in the correct format. Please enter an email address in the following format: 'example@example.com'."],
  },

  // Authentication
  hashedPassword: String,
  provider: String,
  role: String,
  salt: String,
});

/**
 * Validations
 */

// validate empty email without using 'required: true' (which would fail when using OAuth)
UserSchema
  .path('email')
  .validate(function(email) {
    if (authTypes.indexOf(this.provider) !== -1) return true; // always returns 'true' if using OAuth
    return email.length;
  }, 'Email cannot be blank');

// validate empty password without using 'required: true' (which would fail when using OAuth)
UserSchema
  .path('hashedPassword')
  .validate(function(hashedPassword) {
    if (authTypes.indexOf(this.provider) !== -1) return true; // always returns 'true' if using OAuth
    return hashedPassword && hashedPassword.length > 0;
  }, 'Password cannot be blank');

// validate email is not taken
UserSchema
  .path('email')
  .validate(async (email) => {
    try {
      let user = await mongoose.model('User').findOne({email: email});
      return !user;
    } catch(err) {
      throw err;
    }
}, 'The specified email address is already in use.');


/**
 * Instance Methods
 */

UserSchema.methods = {
  // check if the passwords are the same
  authenticate: function(plainText) {
    return this.encryptPassword(plainText) === this.hashedPassword;
  },

  // generate a cryptographic 'salt'
  makeSalt: function() {
    return crypto.randomBytes(16).toString('base64');
  },

  // encrypt password using salt
  encryptPassword: function(password) {
    if (!password || !this.salt) return '';
    var salt = new Buffer(this.salt, 'base64');
    return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('base64');
  }
};


/**
* Virtual Methods
**/

// used to quickly create/access hashedPassword
UserSchema
  .virtual('password')
  .set(function(password) {
    this._password = password;
    this.salt = this.makeSalt();
    this.hashedPassword = this.encryptPassword(password);
  })
  .get(function() {
    return this._password;
  });

// public profile information
UserSchema
  .virtual('public')
  .get(function() {
    return {
      'name': this.name,
      'role': this.role
    };
  });

// user id token
UserSchema
  .virtual('token')
  .get(function() {
    return {
      '_id': this._id,
      'role': this.role
    };
  });

UserSchema.set('toJSON',  { virtuals: true });

export default mongoose.model('User', UserSchema);
