import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VitalsFormComponent } from './vitals-form.component';

describe('VitalsFormComponent', () => {
  let component: VitalsFormComponent;
  let fixture: ComponentFixture<VitalsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VitalsFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VitalsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
