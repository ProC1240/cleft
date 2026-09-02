import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { PartyController } from "./party.controller";
import { PartyService } from "./party.service";

@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt" })],
  controllers: [PartyController],
  providers: [PartyService],
})
export class PartyModule {}
