import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VitalsHistoryComponent } from './vitals-history.component';

describe('VitalsHistoryComponent', () => {
  let component: VitalsHistoryComponent;
  let fixture: ComponentFixture<VitalsHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VitalsHistoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VitalsHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
