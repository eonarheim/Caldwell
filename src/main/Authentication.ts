/// <reference path="../../typings/index.d.ts" />

import * as url from "url";
import * as querystring from "querystring";
import * as fetch from 'node-fetch';
import * as _ from "lodash";

import * as oauth2_auth from "./OAuth2";
import * as openid_auth from "./OpenID";

export enum IdentityProvider {
    AzureActiveDirectory, Steam, Google
};

export class AuthenticatedUser {
    constructor(
        // TODO for all identity providers, get the nickname of the user
        public displayName:string, // This is a displayed username, and does not uniquely identify the user.
        public uniqueIdsByProvider:Map<IdentityProvider, string> // These are the id providers connected by the user, and the unique IDs within. These identify the user.
        ) {
    }
}

export class Authentication {

    public static requestUserAuthenticate(idp:IdentityProvider, windowParams):Promise<any> {
        switch (idp) {
            case IdentityProvider.AzureActiveDirectory:
                return oauth2_auth.authenticate(new oauth2_auth.ConfigList.AADConfig(), windowParams)
                    .then((token:any) => {
                        console.log("Token fetch complete.");
                        console.log(JSON.stringify(token));

                        // use your token.access_token
                        /*if (token.expires_on > (Date.now() * 1000)) {// token.expires_on is in seconds from aadOauth
                            aadOauth.refreshToken(token.refresh_token)
                                .then((newToken:any) => {
                                    token = newToken;
                                });
                        }*/

                        // Fetch the user's information
                        return Authentication.bearerAuthenticatedGet(token.access_token, "https://graph.windows.net/me?api-version=1.6")
                            .then((queryJson:any) => {
                                return new AuthenticatedUser(queryJson.displayName, 
                                    new Map<IdentityProvider, string>().set(IdentityProvider.AzureActiveDirectory, queryJson.oid));
                            });
                    });
            case IdentityProvider.Google:
                return oauth2_auth.authenticate(new oauth2_auth.ConfigList.GoogleConfig(), windowParams, "profile")
                    .then((token:any) => {
                        console.log("Token fetch complete.");
                        console.log(JSON.stringify(token));

                        // Fetch the user's information
                        return Authentication.bearerAuthenticatedGet(token.access_token, "https://people.googleapis.com/v1/people/me")
                            .then((queryJson:any) => {
                                // Prefer nickname, fallback to full display name
                                var displayName = Authentication.getPrimaryValue(_.get(queryJson, "nicknames", []) as Object[], "value") ||
                                  Authentication.getPrimaryValue(_.get(queryJson, "names", []) as Object[], "displayName")
                                //console.log("displayName: " + displayName);
                                return new AuthenticatedUser(displayName, 
                                    new Map<IdentityProvider, string>().set(IdentityProvider.Google, queryJson.resourceName));
                            });
                    });
            case IdentityProvider.Steam:
                var steamConfig:openid_auth.ConfigList.SteamConfig = new openid_auth.ConfigList.SteamConfig()
                return openid_auth.authenticate(steamConfig, windowParams)
                    .then((openIdClaim) => {
                        var queryUrl:url.Url = url.parse("http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/");
                        queryUrl.query = {
                            "key": steamConfig.APIKey,
                            "steamIds": openIdClaim['steam_id'],
                            "format": "json"
                        }

                        const header = {
                            'Accept': 'application/json',
                            'Content-Type': 'application/x-www-form-urlencoded',
                        };
                        return fetch(url.format(queryUrl), {
                            method: 'GET',
                            headers: header,
                        })
                        .then(res => {
                            return res.json();
                        });
                    })
                    .then((queryJson:any) => {
                        let result = queryJson['response']['players'][0];
                        result.displayName = result['personaname'];
                        return result;
                    });
            default:
                return Promise.reject(new Error("Unsupported identity provider"));
        }
    }

    protected static bearerAuthenticatedGet(accessToken:string, url:string):Promise<any> {
        var bearerToken:string = "Bearer " + accessToken;
        console.log("Bearer token: " + bearerToken);
        const header = {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': bearerToken
        };

        return fetch(url, {
            method: 'GET',
            headers: header,
        })
        .then(res => {
            return res.json();
        })
        .then((resultJson:any) => {
            console.log("Authenticated fetch complete, destination was " + url);
            console.log(JSON.stringify(resultJson));
            return resultJson;
        });
    }

    // Written for Google-formatted user data, picks the "primary" value when there are multiple present
    protected static getPrimaryValue(valueArray:Object[], targetPropertyName:string) {
        for (let value of valueArray) {
            //console.log("Checking for primary: " + JSON.stringify(value));
            if (_.get(value, "metadata.primary", false)) { // if value.metadata.primary exists and is true
                return _.get(value, targetPropertyName, undefined); // return value[targetPropertyName] || undefined
            }
        }
        return undefined;
    }

}