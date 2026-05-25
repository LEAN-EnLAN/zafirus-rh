import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MockWorkspaceApiService } from './mock-workspace-api.service';

describe('MockWorkspaceApiService', () => {
  let service: MockWorkspaceApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [MockWorkspaceApiService] });
    service = TestBed.inject(MockWorkspaceApiService);
  });

  it('returns success for createGoogleUser', async () => expect((await service.createGoogleUser('e','p','f','l')).success).toBeTrue());
  it('returns success for addUserToGroups', async () => expect((await service.addUserToGroups('u',['g'])).success).toBeTrue());
  it('returns success for configureGmailSignature', async () => expect((await service.configureGmailSignature('u','s')).success).toBeTrue());
  it('returns success for sendWelcomeEmail', async () => expect((await service.sendWelcomeEmail('a@a.com','s','b')).success).toBeTrue());
  it('returns success for announceInGroup', async () => expect((await service.announceInGroup('g','m')).success).toBeTrue());
  it('returns success for requestDevice', async () => expect((await service.requestDevice('e','laptop')).success).toBeTrue());
  it('returns success for provisionWorkspace', async () => expect((await service.provisionWorkspace('e')).success).toBeTrue());

  it('simulates async delay', fakeAsync(() => {
    let done = false;
    service.createGoogleUser('e', 'p', 'f', 'l').then(() => { done = true; });
    tick(2000);
    expect(done).toBeTrue();
  }));
});
