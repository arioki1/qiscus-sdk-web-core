import { IQHttpAdapter } from './http'
import QUrlBuilder from '../utils/url-builder'
import { IQUserAdapter, IQUser, IQUserExtraProps, QNonce } from '../defs';

export class QUser implements IQUser {
  id: number
  userId: string
  displayName: string
  avatarUrl?: string

  static fromJson (json: { id: number, email: string, username: string, avatar_url: string }): IQUser {
    const user = new QUser()
    user.id = json.id
    user.userId = json.email
    user.displayName = json.username
    user.avatarUrl = json.avatar_url
    return user
  }
}

type NonceResponse = {
  status: number,
  results: { expired_at: number, nonce: string }
}

/**
 * const user = getUserAdapter()
 * user.login(userId, userKey): Promise
 * user.clear(): Promise
 * get user.token
 * get user.currentUser
 *
 */
export default function getUserAdapter (http: () => IQHttpAdapter): IQUserAdapter {
  let currentUser: IQUser | null = null
  let token: string | null = null

  return {
    async login (userId: string, userKey: string, { avatarUrl, extras, name }: IQUserExtraProps): Promise<IQUser> {
      const data = {
        email: userId,
        password: userKey,
        avatar_url: avatarUrl,
        username: name,
        extras: extras
      }
      const resp = await http().post<UserResponse.RootObject>('login_or_register', data);
      const user = QUser.fromJson(resp.results.user);
      currentUser = user;
      token = resp.results.user.token;
      return user;
    },
    clear () {
      currentUser = null
      token = null
    },
    async blockUser (userId: string): Promise<IQUser> {
      const resp = await http().post<BlockUserResponse.RootObject>('block_user', {
        token: this.token,
        user_email: userId
      });
      return QUser.fromJson(resp.results.user);
    },
    async getBlockedUser (page: number = 1, limit: number = 20): Promise<IQUser[]> {
      const url = QUrlBuilder('get_user_list')
        .param('token', this.token)
        .param('page', page)
        .param('limit', limit)
        .build()
      const resp = await http().get<BlockedUserListResponse.RootObject>(url);
      return resp.results.blocked_users
        .map((user) => QUser.fromJson(user));
    },
    async getUserList (query: string = '', page: number = 1, limit: number = 20): Promise<IQUser[]> {
      const url = QUrlBuilder('get_user_list')
        .param('token', token)
        .param('query', query)
        .param('page', page)
        .param('limit', limit)
        .build()
      const resp = await http().get<UserListResponse.RootObject>(url);
      return resp.results.users
        .map((user: any) => QUser.fromJson(user));
    },
    async unblockUser (userId: string): Promise<IQUser> {
      const resp = await http().post<BlockUserResponse.RootObject>('unblock_user', {
        token: this.token,
        user_email: userId
      });
      return QUser.fromJson(resp.results.user);
    },
    async setUserFromIdentityToken (identityToken: string): Promise<IQUser> {
      const resp = await http().post<UserResponse.RootObject>('auth/verify_identity_token', {
        identity_token: identityToken
      });
      return QUser.fromJson(resp.results.user);
    },
    async updateUser (name?: string, avatarUrl?: string, extras?: string): Promise<IQUser> {
      const data = {
        token: this.token,
        name,
        avatar_url: avatarUrl,
        extras: extras
      }
      const resp = await http().patch<UserResponse.RootObject>('my_profile', data);
      return QUser.fromJson(resp.results.user);
    },
    async getNonce (): Promise<QNonce> {
      const resp = await http().get<NonceResponse>('auth/nonce');
      return { expired: resp.results.expired_at, nonce: resp.results.nonce };
    },
    async getUserData (): Promise<IQUser> {
      const resp = await http().get<UserResponse.RootObject>('my_profile');
      return QUser.fromJson(resp.results.user);
    },
    async registerDeviceToken(deviceToken: string, platform: string = 'rn'): Promise<boolean> {
      const resp = await http().post<DeviceTokenResponse.RootObject>('set_user_device_token', {
        token: token,
        device_platform: platform,
        device_token: deviceToken
      });
      return resp.results.changed;
    },
    async unregisterDeviceToken(deviceToken: string, platform: string = 'rn'): Promise<boolean> {
      const resp = await http().post<DeviceTokenResponse.RootObject>('remove_user_device_token', {
        token: token,
        device_platform: platform,
        device_token: deviceToken
      });
      return resp.results.changed;
    },
    get token () { return token },
    get currentUser () { return currentUser },
    get currentUserId () { return currentUser ? currentUser.userId : null }
  }
}

// Response type
declare module UserResponse {

  export interface App {
    code: string;
    id: number;
    id_str: string;
    name: string;
  }

  export interface Avatar2 {
    url: string;
  }

  export interface Avatar {
    avatar: Avatar2;
  }

  export interface Extras {
    role: string;
  }

  export interface User {
    app: App;
    avatar: Avatar;
    avatar_url: string;
    email: string;
    extras: Extras;
    id: number;
    id_str: string;
    last_comment_id: number;
    last_comment_id_str: string;
    last_sync_event_id: number;
    pn_android_configured: boolean;
    pn_ios_configured: boolean;
    rtKey: string;
    token: string;
    username: string;
  }

  export interface Results {
    user: User;
  }

  export interface RootObject {
    results: Results;
    status: number;
  }

}
declare module BlockUserResponse {

  export interface Avatar2 {
    url: string;
  }

  export interface Avatar {
    avatar: Avatar2;
  }

  export interface Extras {
  }

  export interface User {
    avatar: Avatar;
    avatar_url: string;
    email: string;
    extras: Extras;
    id: number;
    id_str: string;
    username: string;
  }

  export interface Results {
    user: User;
  }

  export interface RootObject {
    results: Results;
    status: number;
  }

}
declare module UserListResponse {

  export interface Meta {
    total_data: number;
    total_page: number;
  }

  export interface Extras {
  }

  export interface User {
    avatar_url: string;
    created_at: Date;
    email: string;
    extras: Extras;
    id: number;
    name: string;
    updated_at: Date;
    username: string;
  }

  export interface Results {
    meta: Meta;
    users: User[];
  }

  export interface RootObject {
    results: Results;
    status: number;
  }

}
declare module BlockedUserListResponse {

  export interface Avatar2 {
    url: string;
  }

  export interface Avatar {
    avatar: Avatar2;
  }

  export interface Extras {
  }

  export interface BlockedUser {
    avatar: Avatar;
    avatar_url: string;
    email: string;
    extras: Extras;
    id: number;
    id_str: string;
    username: string;
  }

  export interface Results {
    blocked_users: BlockedUser[];
    total: number;
  }

  export interface RootObject {
    results: Results;
    status: number;
  }

}
declare module DeviceTokenResponse {

  export interface Results {
    changed: boolean;
    pn_android_configured: boolean;
    pn_ios_configured: boolean;
  }

  export interface RootObject {
    results: Results;
    status: number;
  }

}
