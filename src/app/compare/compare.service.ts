import { Injectable } from '@angular/core';
import { Http, Headers, Response } from '@angular/http';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/operator/map';

import { CompareData } from './compare-data.model';
import { AuthService } from '../user/auth.service';

@Injectable()
export class CompareService {
  dataEdited = new BehaviorSubject<boolean>(false);
  dataIsLoading = new BehaviorSubject<boolean>(false);
  dataLoaded = new Subject<CompareData[]>();
  dataLoadFailed = new Subject<boolean>();
  userData: CompareData;
  constructor(private http: Http,
              private authService: AuthService) {
  }

  onStoreData(data: CompareData) {
    this.dataLoadFailed.next(false);
    this.dataIsLoading.next(true);
    this.dataEdited.next(false);
    this.userData = data;

    // Session exist?
    this.authService.getAuthenticatedUser().getSession((err,session) => {
      if (err) {
        return;
      }

      // Yes. POST something to the API Gateway ...
      // Use the Cognito token attached to the user's session.
      this.http.post('https://b74xyba8f7.execute-api.us-east-2.amazonaws.com/dev/compare-yourself', data, {        
        headers: new Headers({'Authorization': session.getIdToken().getJwtToken(), 'Content-Type': 'application/json'})
      })
        .subscribe(
          (result) => {
            this.dataLoadFailed.next(false);
            this.dataIsLoading.next(false);
            this.dataEdited.next(true);
          },
          (error) => {
            this.dataIsLoading.next(false);
            this.dataLoadFailed.next(true);
            this.dataEdited.next(false);
          }
        );
    })
  }
  onRetrieveData(all = true) {
    this.dataLoaded.next(null);
    this.dataLoadFailed.next(false);

    // Get the access token for the logged in user.
    this.authService.getAuthenticatedUser().getSession((err, session) => {
      
      const queryParam = '?accessToken=' + session.getAccessToken().getJwtToken();
      let urlParam = 'all';
      
      if (!all) {
        urlParam = 'single';
      }
      
      // Call compare-yourself with the access token  ... in the query string AND the header???? What? Why both?
      this.http.get('https://b74xyba8f7.execute-api.us-east-2.amazonaws.com/dev/compare-yourself/' + urlParam + queryParam, {
        headers: new Headers({'Authorization': session.getAccessToken().getJwtToken(), 'Content-Type': 'application/json'})
      })
        .map(
          (response: Response) => response.json()
        )
        .subscribe(
          (data) => {
            if (all) {
              this.dataLoaded.next(data);
            } else {
              console.log(data);
              if (!data) {
                this.dataLoadFailed.next(true);
                return;
              }
              this.userData = data[0];
              this.dataEdited.next(true);
            }
          },
          (error) => {
            this.dataLoadFailed.next(true);
            this.dataLoaded.next(null);
          }
        );
    });

  }
  onDeleteData() {
    this.dataLoadFailed.next(false);

    this.authService.getAuthenticatedUser().getSession((err, session) => {
      this.http.delete('https://b74xyba8f7.execute-api.us-east-2.amazonaws.com/dev/compare-yourself/', {
        headers: new Headers({'Authorization': session.getIdToken().getJwtToken(),'Content-Type': 'application/json'})
      })
        .subscribe(
          (data) => {
            console.log(data);
          },
          (error) => this.dataLoadFailed.next(true)
        );
    })

  }
}
