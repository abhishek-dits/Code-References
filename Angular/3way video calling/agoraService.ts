/* agora.service.ts */

import { Injectable } from '@angular/core';
import AgoraRTC, { ILocalTrack, IAgoraRTCClient, IAgoraRTCRemoteUser, IRemoteVideoTrack } from 'agora-rtc-sdk-ng';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { StorageService } from '../../../core/services/storage/storage.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AgoraService {
  private client: IAgoraRTCClient;
  private appId = environment.agoraAppId;
  userData:any;
  agoraPatientCallData: any;
  agoraDoctorCallData: any;

  private channelJoinedSource = new BehaviorSubject<boolean>(false);
  channelJoined$ = this.channelJoinedSource.asObservable();

  public isUserVideoMute = new Subject<any>;
  isUserVideoMute$ = this.isUserVideoMute.asObservable();

  isRemoteUserConnected:boolean = false;
  isRemoteUserVideoMute:boolean = false;

  private remoteUsers: Map<number, IRemoteVideoTrack> = new Map();

  constructor(private _storage: StorageService,private router: Router) { 
    this.userData = this._storage.getUserData();
    if(this.appId == '')
      console.error('APPID REQUIRED -- Open AgoraService.ts and update appId ')
    this.client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp9'})
}

  async joinChannel(channelName: string, token: string | null, uid: string | null) {
    await this.client.join(this.appId, channelName, token, this.userData.userId)
    this.channelJoinedSource.next(true);
  }

  async leaveChannel() {
    await this.client.leave();
    this.isRemoteUserConnected = false;
    this.channelJoinedSource.next(false)
  }

  redirectToVideoCall(data: any,rowData?: any) {
      this.router.navigate(['/main/video-call'], { state: { channelName: data.channel_name, agoraToken: data.token, aptId: rowData || rowData.id } })
  }

  setupLocalTracks(): Promise<ILocalTrack[]> {
    return AgoraRTC.createMicrophoneAndCameraTracks();
  }

  getClient() {
    return this.client
  }
}

