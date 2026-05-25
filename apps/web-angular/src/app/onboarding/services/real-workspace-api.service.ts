import { Injectable } from '@angular/core';
import {
  AddUserToGroupsResponse,
  AnnounceInGroupResponse,
  ConfigureGmailSignatureResponse,
  CreateGoogleUserResponse,
  IWorkspaceApi,
  ProvisionWorkspaceResponse,
  RequestDeviceResponse,
  SendWelcomeEmailResponse,
} from './workspace-api.interface';

@Injectable({ providedIn: 'root' })
export class RealWorkspaceApiService implements IWorkspaceApi {
  async createGoogleUser(
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<CreateGoogleUserResponse> {
    /**
     * Provisions a Google Workspace user via Google Admin SDK.
     * @deferred Phase 5 — Backend integration (NestJS HTTP client).
     */
    return { success: false, error: 'API no configurada' };
  }

  async addUserToGroups(userId: string, groupEmails: string[]): Promise<AddUserToGroupsResponse> {
    /**
     * Provisions a Google Workspace user via Google Admin SDK.
     * @deferred Phase 5 — Backend integration (NestJS HTTP client).
     */
    return { success: false, error: 'API no configurada' };
  }

  async configureGmailSignature(userId: string, signature: string): Promise<ConfigureGmailSignatureResponse> {
    /**
     * Provisions a Google Workspace user via Google Admin SDK.
     * @deferred Phase 5 — Backend integration (NestJS HTTP client).
     */
    return { success: false, error: 'API no configurada' };
  }

  async sendWelcomeEmail(to: string, subject: string, body: string): Promise<SendWelcomeEmailResponse> {
    /**
     * Provisions a Google Workspace user via Google Admin SDK.
     * @deferred Phase 5 — Backend integration (NestJS HTTP client).
     */
    return { success: false, error: 'API no configurada' };
  }

  async announceInGroup(groupEmail: string, message: string): Promise<AnnounceInGroupResponse> {
    /**
     * Provisions a Google Workspace user via Google Admin SDK.
     * @deferred Phase 5 — Backend integration (NestJS HTTP client).
     */
    return { success: false, error: 'API no configurada' };
  }

  async requestDevice(employeeId: string, deviceType: string): Promise<RequestDeviceResponse> {
    /**
     * Provisions a Google Workspace user via Google Admin SDK.
     * @deferred Phase 5 — Backend integration (NestJS HTTP client).
     */
    return { success: false, error: 'API no configurada' };
  }

  async provisionWorkspace(employeeId: string): Promise<ProvisionWorkspaceResponse> {
    /**
     * Provisions a Google Workspace user via Google Admin SDK.
     * @deferred Phase 5 — Backend integration (NestJS HTTP client).
     */
    return { success: false, error: 'API no configurada' };
  }
}
