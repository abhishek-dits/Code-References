import { Component, ComponentRef, Input, OnDestroy, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { Router } from '@angular/router';
import { IAgoraRTCClient, IAgoraRTCRemoteUser, UID } from 'agora-rtc-sdk-ng';
import { StorageService } from '../../../core/services/storage/storage.service';
import { Unsubscriber } from '../../../core/utils/unsubscriber';
import { AgoraService } from '../../services/agora/agora.service';
import { ControlsService } from '../../services/controls/controls.service';
import { SocketService } from '../../services/socket/socket.service';
import { RemotePatientComponent } from '../remote-patient/remote-patient.component';
import { RemoteUserComponent } from '../remote-user/remote-user.component';

@Component({
  selector: 'm-app-remote-stream',
  standalone: true,
  imports: [],
  templateUrl: './remote-stream.component.html',
  styleUrl: './remote-stream.component.scss'
})
export class RemoteStreamComponent extends Unsubscriber implements OnInit, OnDestroy {
  client: IAgoraRTCClient;
  remoteUserComponentRefs: Map<string, ComponentRef<any>>;
  @Input() aptId!: string;

  // remotePatientComponentRefs: Map<string, ComponentRef<RemotePatientComponent>>;


  uid!: UID;
  userData: any;
  onReady?: (element: HTMLElement) => void;
  @ViewChild('remoteVideoContainer', { read: ViewContainerRef }) remoteVideoContainer!: ViewContainerRef;
  userCount: number = 0;
  agoraData: any;

  constructor(private agoraService: AgoraService, private _controlsService: ControlsService, private _storage: StorageService, private _socket: SocketService, private _agora: AgoraService, private _router: Router) {
    super();
    console.log("REMOTE STREAM COMPONENT")
    this.userData = this._storage.getUserData();
    this.agoraData = JSON.parse(localStorage.getItem('agoraData') as any);
    this.client = this.agoraService.getClient()
    this.remoteUserComponentRefs = new Map();

    this.subscription.add(this._socket.handleCallAbort.subscribe((res: any) => {
      if (res) {
        if (res.data.role == 30000) {
          let uidData = {
            uid: res.data.userId
          }
          this.removeComponent(uidData)
        } else {
          this._agora.leaveChannel();
          this.client.leave();
          this._router.navigate(['/main/dashboard'])
        }
      }
    }));
  }

  ngOnInit(): void {
    // add listeners when component mounts
    this.client.on('user-published', this.handleRemoteUserPublished)
    this.client.on('user-unpublished', this.handleRemoteUserUnpublished)
  }

  override ngOnDestroy(): void {
    // remove listeners when component is removed
    this.client.off('user-published', this.handleRemoteUserPublished)
    this.client.off('user-unpublished', this.handleRemoteUserUnpublished)
    this.agoraData = null;
    this.userData = null;
    this.client.leave();
    this.clearRemoteUsers();
    location.reload();
  }

  private handleRemoteUserPublished = async (user: any, mediaType: "audio" | "video" | "datachannel") => {
    await this.client.subscribe(user, mediaType)
    if (mediaType === 'audio') {
      user.audioTrack?.play()
    } else if (mediaType === 'video') {
      this.removeComponent(user);
      const uid = user.uid;
      this.agoraService.isRemoteUserConnected = true;
      if (uid == 'f4f111bf-ecb4-40d4-8a85-0b14d971d575' || this.userData.role == 30000) {
        const remoteUserComponentRef: ComponentRef<RemoteUserComponent> = this.remoteVideoContainer.createComponent(RemoteUserComponent)
        remoteUserComponentRef.instance.uid = uid;
        remoteUserComponentRef.instance.aptId = this.aptId;
        remoteUserComponentRef.instance.onReady = (remoteUserDiv: any) => {
          user.videoTrack?.play(remoteUserDiv)
        }
        this.remoteUserComponentRefs.set(uid.toString(), remoteUserComponentRef)

      }
      else {
        const uid = user.uid;
        const remoteUserComponentRef: ComponentRef<RemotePatientComponent> = this.remoteVideoContainer.createComponent(RemotePatientComponent)
        remoteUserComponentRef.instance.uid = uid;
        remoteUserComponentRef.instance.aptId = this.aptId;
        remoteUserComponentRef.instance.onReady = (remoteUserDiv: any) => {
          this._controlsService.remoteStreamData.next(user);
        }
        this.remoteUserComponentRefs.set(uid.toString(), remoteUserComponentRef)
      }
      // create a remote user component for each new remote user and add to DOM
    }
  }

  private handleRemoteUserUnpublished = async (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video" | "datachannel") => {
    if (mediaType === 'video') {

      // this.removeComponent(user);
      this.agoraService.isUserVideoMute.next(user)
    }
  }

  private removeComponent(user: any) {
    this.agoraService.isRemoteUserVideoMute = true;
    const remoteUserUid = user.uid.toString();
    // retrieve the div from remoteUserComponentRefs and remove it from DOM
    const componentRef = this.remoteUserComponentRefs.get(remoteUserUid);
    if (componentRef) {
      const viewIndex = this.remoteVideoContainer.indexOf(componentRef?.hostView);
      this.remoteVideoContainer.remove(viewIndex);
      // remove entry from remoteUserComponentRefs
      this.remoteUserComponentRefs.delete(remoteUserUid);
    } else {
      console.log(`Unable to find remoteUser with UID: ${user.uid}`);
    }
  }

  clearRemoteUsers(): void {
    this.remoteVideoContainer.clear();
    this.remoteUserComponentRefs.clear();
  }

}

