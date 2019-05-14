import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs/Subject';

import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

import { CognitoUserPool, CognitoUserAttribute, CognitoUser, AuthenticationDetails, CognitoUserSession } from 'amazon-cognito-identity-js';

import { User } from './user.model';

// Get POOL and Client App information from AWS Console / Cognito.
const POOL_DATA = {
  UserPoolId : '<GET THIS FROM COGNITO>',
  ClientId : '<GET THIS FROM COGNITO>'
}

// Create a User Pool.
const userPool = new CognitoUserPool( POOL_DATA );

@Injectable()
export class AuthService {
  
  // Exposes a bunch of subjects that can be subscribed to by the consumer.
  authIsLoading = new BehaviorSubject<boolean>(false);
  authDidFail = new BehaviorSubject<boolean>(false);
  authStatusChanged = new Subject<boolean>();

  // Store the authenticated user.
  registeredUser : CognitoUser;
  
  constructor(private router: Router) {}
  
  signUp(username: string, email: string, password: string): void {
    
    this.authIsLoading.next(true);
    
    const user: User = {
      username: username,
      email: email,
      password: password
    };
    
    // Array containing all of the attributte required in Cognito for a new user.
    const attrList : CognitoUserAttribute[] = [];
    
    const emailAttribute = {
      Name: 'email',
      Value: user.email
    };

    // Add more attributtes as necessary ...

    attrList.push( new CognitoUserAttribute(emailAttribute) );

    userPool.signUp(user.username,user.password,attrList,null,(err,result) => {
      // Cognito error callback.
      if (err) {
        this.authDidFail.next(true);
        this.authIsLoading.next(false);
        return;
      }
      this.authDidFail.next(false);

      // Get the registered user from the response.
      this.registeredUser = result.user;

    });

    return;
  }

  /**
   * Confirms user after registration.
   * @param username 
   * @param code 
   */
  confirmUser(username: string, code: string) {
    this.authIsLoading.next(true);
    
    const userData = {
      Username: username,
      Pool: userPool
    };


    const cognitoUser = new CognitoUser(userData);
    cognitoUser.confirmRegistration(code, true, ( err, result) => {
      if (err) {
        this.authDidFail.next(true);
        this.authIsLoading.next(true);
        return;
      }      
      this.authDidFail.next(false);
      this.authIsLoading.next(false);
      this.router.navigate(['/']);
    })
  }
  signIn(username: string, password: string): void {

    this.authIsLoading.next(true);
    
    const authData = {
      Username: username,
      Password: password
    };
    
    const authDetails = new AuthenticationDetails(authData);
    
    const userData = {
      Username : username,
      Pool : userPool
    }
    
    const cognitoUser = new CognitoUser(userData);
    const that = this; // Need to save a reference to the existing scope for subjects.

    // Authenticate takes two callbacks ...
    cognitoUser.authenticateUser(authDetails, {
      onSuccess : function ( result: CognitoUserSession) { 
        // Result will contain the tokens for the user's session.
        that.authStatusChanged.next(true);
        that.authDidFail.next(false);
        that.authIsLoading.next(false);
        console.log(result);
      },
      onFailure : function (err) {
        that.authDidFail.next(true);
        that.authIsLoading.next(false);
        console.log(err);
      }
    } );
    this.authStatusChanged.next(true);
    
    return;
  }
  getAuthenticatedUser() {
  }
  logout() {
    this.authStatusChanged.next(false);
  }
  isAuthenticated(): Observable<boolean> {
    const user = this.getAuthenticatedUser();
    const obs = Observable.create((observer) => {
      if (!user) {
        observer.next(false);
      } else {
        observer.next(false);
      }
      observer.complete();
    });
    return obs;
  }
  initAuth() {
    this.isAuthenticated().subscribe(
      (auth) => this.authStatusChanged.next(auth)
    );
  }
}
