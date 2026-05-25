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
     * Creates a Google Workspace user via Google Admin SDK.
     * @deferred Phase 5 — Backend integration (NestJS HTTP client).
     */
    return { success: false, error: 'API no configurada' };
  }

  async addUserToGroups(userId: string, groupEmails: string[]): Promise<AddUserToGroupsResponse> {
    /**
     * Adds an existing user to one or more Google Groups.
     * @deferred Phase 5 — Backend integration (NestJS HTTP client).
     */
    return { success: false, error: 'API no configurada' };
  }

  async configureGmailSignature(userId: string, signature: string): Promise<ConfigureGmailSignatureResponse> {
    /**
     * Configures the Gmail signature for an existing user.
     * @deferred Phase 5 — Backend integration (NestJS HTTP client).
     */
    return { success: false, error: 'API no configurada' };
  }

  async sendWelcomeEmail(to: string, subject: string, body: string): Promise<SendWelcomeEmailResponse> {
    /**
     * Sends the onboarding welcome email to the employee.
     * @deferred Phase 5 — Backend integration (NestJS HTTP client).
     */
    return { success: false, error: 'API no configurada' };
  }

  async announceInGroup(groupEmail: string, message: string): Promise<AnnounceInGroupResponse> {
    /**
     * Publishes an onboarding announcement in a target group.
     * @deferred Phase 5 — Backend integration (NestJS HTTP client).
     */
    return { success: false, error: 'API no configurada' };
  }

  async requestDevice(employeeId: string, deviceType: string): Promise<RequestDeviceResponse> {
    /**
     * Requests a device assignment/provisioning for the employee.
     * @deferred Phase 5 — Backend integration (NestJS HTTP client).
     */
    return { success: false, error: 'API no configurada' };
  }

  async provisionWorkspace(employeeId: string): Promise<ProvisionWorkspaceResponse> {
    /**
     * Runs the consolidated workspace provisioning flow for the employee.
     * @deferred Phase 5 — Backend integration (NestJS HTTP client).
     */
    return { success: false, error: 'API no configurada' };
  }
}
